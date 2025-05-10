from flask import Flask, jsonify, request, render_template, url_for
import requests
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import json
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from flask import Flask, render_template, redirect, url_for, request, session, flash
import joblib
import pandas as pd
# Load biến môi trường
load_dotenv()
# Khởi tạo Flask App
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Giới hạn 16MB
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)




# ========== CẤU HÌNH API GEMINI ==========
API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDte6xaAsNwx4cuEtnXXQGqMXJP7qtQDDI")
MODEL_NAME = "gemini-2.0-flash"  # Đã thay đổi sang gemini-2.0-flash cho rẻ và miễn phí
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"

def chat_with_gemini(prompt):
    """Giao tiếp với API Gemini"""
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(API_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "Không có phản hồi từ Gemini.")
    except requests.exceptions.RequestException as e:
        return f"Lỗi kết nối API: {str(e)}"
    except Exception as e:
        return f"Lỗi xử lý phản hồi: {str(e)}"

# ========== FIX LỖI BATCH NORMALIZATION ==========
class CustomBatchNormalization(tf.keras.layers.BatchNormalization):
    """Custom BatchNorm để fix lỗi deserialization"""
    def __init__(self, axis=-1, **kwargs):
        if isinstance(axis, list):
            axis = axis[0] if len(axis) > 0 else -1
        super().__init__(axis=axis, **kwargs)

# Đăng ký custom layer
tf.keras.utils.get_custom_objects().update({
    'BatchNormalization': CustomBatchNormalization
})

# ========== LOAD MÔ HÌNH ==========
def load_model_safely(model_path):
    """Tải mô hình với nhiều phương pháp dự phòng"""
    try:
        # Phương pháp 1: Tải thông thường
        model = tf.keras.models.load_model(model_path, compile=False)
        print("✅ Mô hình tải thành công với compile=False")
        print("🔍 Input shape của mô hình:", model.input_shape)
        print("🔍 Output shape của mô hình:", model.output_shape)
        print("🔍 Các lớp đầu tiên của mô hình:")
        model.summary(line_length=120)
        return model
    except Exception as e:
        print(f"⚠️ Lỗi phương pháp 1: {str(e)}")
        try:
            # Phương pháp 2: Dùng custom_objects
            model = tf.keras.models.load_model(
                model_path,
                compile=False,
                custom_objects={'BatchNormalization': CustomBatchNormalization}
            )
            print("✅ Mô hình tải thành công với custom_objects")
            print("🔍 Input shape của mô hình:", model.input_shape)
            print("🔍 Output shape của mô hình:", model.output_shape)
            print("🔍 Các lớp đầu tiên của mô hình:")
            model.summary(line_length=120)
            return model
        except Exception as e:
            print(f"❌ Lỗi nghiêm trọng: {str(e)}")
            return None

# Tải mô hình
model = load_model_safely("trained_model.h5")

# ========== CẤU HÌNH MÔ HÌNH ==========
IMAGE_SIZE = (350, 350)


# Load class labels
try:
    train_folder = os.path.join('dataset', 'train')
    class_labels = sorted([d for d in os.listdir(train_folder) if os.path.isdir(os.path.join(train_folder, d))])
    print(f"✅ Loaded {len(class_labels)} class labels")
except Exception as e:
    print(f"❌ Lỗi load class labels: {str(e)}")
    class_labels = []

# Ánh xạ tên bệnh
disease_mapping = {
    "adenocarcinoma_left.lower.lobe_T2_N0_M0_Ib": "Ung thư tuyến - Thùy dưới phổi trái (Giai đoạn Ib)",
    "large.cell.carcinoma_left.hilum_T2_N2_M0_IIIa": "Ung thư tế bào lớn - Rốn phổi trái (Giai đoạn IIIa)",
    "normal": "Bình thường - Không có dấu hiệu bệnh",
    "squamous.cell.carcinoma_left.hilum_T1_N2_M0_IIIa": "Ung thư biểu mô vảy - Rốn phổi trái (Giai đoạn IIIa)"
}

# ========== TIỀN XỬ LÝ ẢNH ==========
def load_and_preprocess_image(img_path):
    """Tiền xử lý ảnh đầu vào"""
    try:
        img = image.load_img(img_path, target_size=IMAGE_SIZE)
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0  # Chuẩn hóa [0,1]
        return img_array
    except Exception as e:
        print(f"Lỗi tiền xử lý ảnh: {str(e)}")
        return None


# ========== ROUTES ==========
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict_page', methods=['GET', 'POST'])
def predict_page():
    # Xử lý khi submit form (POST)
    if request.method == 'POST':
        if 'file' not in request.files:
            return render_template('predict.html', error="Không có file được tải lên")
        
        file = request.files['file']
        if file.filename == '':
            return render_template('predict.html', error="Không có file được chọn")

        try:
            # Lưu file
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Kiểm tra mô hình
            if model is None:
                return render_template('predict.html', error="Mô hình chưa được tải. Vui lòng thử lại sau.")
            
            # Tiền xử lý và dự đoán
            img_array = load_and_preprocess_image(filepath)
            if img_array is None:
                return render_template('predict.html', error="Lỗi xử lý ảnh. Vui lòng thử với ảnh khác.")
            print(f"Shape of input to model: {img_array.shape}")

            predictions = model.predict(img_array)
            predicted_class = np.argmax(predictions[0])
            
            # Lấy kết quả
            if predicted_class < len(class_labels):
                raw_label = class_labels[predicted_class]
                predicted_label = disease_mapping.get(raw_label, raw_label)
                confidence = float(np.max(predictions[0]))
            else:
                predicted_label = "Không xác định"
                confidence = 0.0
            
            return render_template('predict.html', 
                                prediction=predicted_label,
                                confidence=f"{confidence:.2%}",
                                image_url=url_for('static', filename=f'uploads/{filename}'),
                                error=None)
        
        except Exception as e:
            print(f"Lỗi dự đoán: {str(e)}")
            return render_template('predict.html', error=f"Lỗi hệ thống: {str(e)}")
    
    # Xử lý khi GET request (hiển thị form)
    return render_template('predict.html', 
                         prediction=None, 
                         confidence=None, 
                         image_url=None, 
                         error=None)

@app.route("/chatbox", methods=["GET", "POST"])
def chatbox():
    if request.method == "POST":
        user_input = request.form.get("user_input", "").strip()
        if not user_input:
            return render_template("chatbox_AI.html", error="Vui lòng nhập câu hỏi")
        
        # Ghép prompt định danh AI Y tế
        prompt = f"""
        Bạn là một trí tuệ nhân tạo chuyên ngành Y tế. 
        Hãy trả lời chính xác, dễ hiểu và dựa trên kiến thức y học cập nhật.
        Câu hỏi: {user_input}
        """

        response = chat_with_gemini(prompt)
        return render_template("chatbox_AI.html", 
                             user_input=user_input, 
                             response=response)
    
    return render_template("chatbox_AI.html", user_input="", response="")



# ========== AUTH ROUTES ==========
app.secret_key = os.urandom(24)  # Required for session

@app.route('/account')
def account():
    """Redirect to login page"""
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return render_template('account/SignUp_SignIn.html')
@app.route('/admin_dashboard')
def admin_dashboard():
    return render_template('admin/admin_dashboard.html')


@app.route('/register', methods=['GET'])
def register():
    """Render register page"""
    return render_template('account/SignUp_SignIn.html')

@app.route('/logout')
def logout():
    """Handle logout"""
    session.clear()
    flash('Bạn đã đăng xuất thành công', 'info')
    return redirect(url_for('login'))

# ========== PROTECTED ROUTES ==========
@app.route('/dashboard')
def dashboard():
    
    """Trang dashboard sau khi đăng nhập"""
    # Kiểm tra session hoặc token nếu cần
    if 'user_email' not in session:
        flash('Bạn cần đăng nhập để truy cập trang này!', 'warning')
        return redirect(url_for('login'))
    return render_template('dashboard.html')
# ========== MEDICAL RECORDS ==========
@app.route("/profile", methods=["GET", "POST"])
def medical_records():
    """Trang hồ sơ bệnh án"""
    return render_template('profile/Medical_Records.html')
# ========== BOOK APPOINTMENT ==========
@app.route("/book_appointment", methods=["GET", "POST"])
def book_appointment():
    return render_template('appointment/book_appointment.html')
# ========== PREDICT DIASEASE BASE ON SYMPTOMS ==========
# Load model và các thành phần đã lưu
# Load model và các thành phần đã lưu
model1 = joblib.load('saved_model/best_model.pkl')
label_encoders = joblib.load('saved_model/label_encoders.pkl')
feature_names = joblib.load('saved_model/feature_names.pkl')
disease_names = joblib.load('saved_model/disease_encoder.pkl')  # Tải tên bệnh

print("✅ Mô hình và các thành phần đã được tải thành công:", disease_names)

@app.route('/symptoms', methods=['GET', 'POST'])
def symptoms():
    if request.method == 'POST':
        # Lấy dữ liệu từ form
        input_data = {
            'Fever': request.form.get('fever'),
            'Cough': request.form.get('cough'),
            'Fatigue': request.form.get('fatigue'),
            'Difficulty Breathing': request.form.get('breathing'),
            'Age': int(request.form.get('age')),
            'Gender': request.form.get('gender'),
            'Blood Pressure': request.form.get('blood_pressure'),
            'Cholesterol Level': request.form.get('cholesterol')
        }
        
        # Tiền xử lý dữ liệu
        input_df = pd.DataFrame([input_data])
        
        # Áp dụng encoding
        for col in ['Fever', 'Cough', 'Fatigue', 'Difficulty Breathing', 'Gender']:
            input_df[col] = label_encoders[col].transform(input_df[col])
        
        # One-Hot Encoding
        input_df = pd.get_dummies(input_df)
        
        # Đảm bảo đủ features như khi train
        for col in feature_names:
            if col not in input_df.columns:
                input_df[col] = 0
        
        # Dự đoán
        prediction_encoded = model1.predict(input_df[feature_names])[0]
        proba = model1.predict_proba(input_df[feature_names])[0]
        
        # Chuyển mã số về tên bệnh
        prediction = disease_names.inverse_transform([prediction_encoded])[0]
        
        # Lấy top 5 bệnh có xác suất cao nhất
        top5_idx = np.argsort(proba)[-5:][::-1]
        top5_encoded = model1.classes_[top5_idx]
        top5_diseases = disease_names.inverse_transform(top5_encoded)  # Chuyển mã số về tên
        top5_probs = np.round(proba[top5_idx] * 100, 2)

        # Trả về kết quả render
        return render_template('result.html', 
                               prediction=prediction,
                               top5=zip(top5_diseases, top5_probs),
                               input_data=input_data)
    
    return render_template('form.html')


# ========== KHỞI CHẠY ==========
if __name__ == '__main__':
    # Kiểm tra mô hình trước khi chạy
    if model is not None:
        print("🟢 Ứng dụng đã sẵn sàng")
        app.run(debug=True)
    else:
        print("🔴 Không thể khởi chạy do lỗi tải mô hình")