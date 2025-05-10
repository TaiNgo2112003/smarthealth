import pandas as pd
import joblib
import warnings
warnings.filterwarnings('ignore')

class DiseasePredictor:
    def __init__(self):
        # Tải mô hình và các bộ mã hóa
        self.model = joblib.load('model_assets/disease_prediction_model.pkl')
        self.label_encoders = joblib.load('model_assets/label_encoders.pkl')
        self.onehot_categories = joblib.load('model_assets/onehot_categories.pkl')
        self.feature_columns = joblib.load('model_assets/feature_columns.pkl')
    
    def preprocess_input(self, input_data):
        # Chuyển đổi dictionary thành DataFrame
        input_df = pd.DataFrame([input_data])
        
        # Áp dụng LabelEncoder cho các biến binary
        binary_cols = ['Fever', 'Cough', 'Fatigue', 'Difficulty Breathing', 'Gender']
        for col in binary_cols:
            if col in input_df.columns:
                input_df[col] = self.label_encoders[col].transform(input_df[col])
        
        # Áp dụng OneHotEncoding cho các biến non-binary
        non_binary_cols = ['Blood Pressure', 'Cholesterol Level']
        for col in non_binary_cols:
            if col in input_df.columns:
                # Tạo tất cả các cột one-hot có thể có
                for category in self.onehot_categories[col]:
                    input_df[category] = 0
                
                # Đặt giá trị 1 cho category phù hợp
                category_col = f"{col}_{input_df[col].iloc[0]}"
                if category_col in input_df.columns:
                    input_df[category_col] = 1
                
                # Xóa cột gốc
                input_df.drop(col, axis=1, inplace=True)
        
        # Đảm bảo có tất cả các cột cần thiết theo đúng thứ tự
        for col in self.feature_columns:
            if col not in input_df.columns:
                input_df[col] = 0
        
        # Sắp xếp lại các cột theo đúng thứ tự khi train
        input_df = input_df[self.feature_columns]
        
        return input_df
    
    def predict(self, input_data):
        # Tiền xử lý dữ liệu đầu vào
        processed_data = self.preprocess_input(input_data)
        
        # Dự đoán
        prediction = self.model.predict(processed_data)
        probabilities = self.model.predict_proba(processed_data)
        
        # Tạo kết quả chi tiết
        result = {
            'predicted_disease': prediction[0],
            'probabilities': {
                disease: round(prob*100, 2)
                for disease, prob in zip(self.model.classes_, probabilities[0])
            }
        }
        
        return result

# Hàm để nhập input từ người dùng
def get_user_input():
    print("\nNhập thông tin triệu chứng:")
    symptoms = {
        'Fever': input("Sốt (Yes/No): ").strip().capitalize(),
        'Cough': input("Ho (Yes/No): ").strip().capitalize(),
        'Fatigue': input("Mệt mỏi (Yes/No): ").strip().capitalize(),
        'Difficulty Breathing': input("Khó thở (Yes/No): ").strip().capitalize(),
        'Age': int(input("Tuổi: ")),
        'Gender': input("Giới tính (Male/Female): ").strip().capitalize(),
        'Blood Pressure': input("Huyết áp (Low/Normal/High): ").strip().capitalize(),
        'Cholesterol Level': input("Mức cholesterol (Normal/High): ").strip().capitalize()
    }
    return symptoms

if __name__ == "__main__":
    predictor = DiseasePredictor()
    
    while True:
        # Nhập thông tin từ người dùng
        user_input = get_user_input()
        
        # Dự đoán
        result = predictor.predict(user_input)
        
        # Hiển thị kết quả
        print("\n=== Kết quả dự đoán ===")
        print(f"Bệnh dự đoán: {result['predicted_disease']}")
        print("\nXác suất cho các bệnh:")
        for disease, prob in sorted(result['probabilities'].items(), key=lambda x: x[1], reverse=True):
            print(f"- {disease}: {prob}%")
        
        # Hỏi người dùng có muốn tiếp tục không
        continue_pred = input("\nTiếp tục dự đoán? (y/n): ").strip().lower()
        if continue_pred != 'y':
            break