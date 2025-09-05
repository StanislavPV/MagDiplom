from django.contrib.auth import get_user_model
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = get_user_model()
        fields = ('email', 'password', 'name', 'phone_number', 'password_confirm')
        extra_kwargs = {'password': {'write_only': True, 'min_length': 8, 'style': {'input_type': 'password'}}}
        
    def validate(self, data):
        if data['password'] != data.get('password_confirm'):
            raise serializers.ValidationError("Паролі не співпадають.")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm') 
        user = get_user_model().objects.create_user(
            validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            phone_number=validated_data['phone_number']
        )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ('email', 'name', 'phone_number')
        extra_kwargs = {
            'email': {'read_only': True}  
        }
    
    def validate_phone_number(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError("Номер телефону повинен містити тільки цифри.")
        if value and len(value) != 9:
            raise serializers.ValidationError("Номер телефону повинен містити 9 цифр (без коду країни).")
        return value

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField()
    
    def validate_email(self, value):
        User = get_user_model()
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Користувача з такою електронною поштою не знайдено.")
        return value
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Паролі не співпадають.")
        return data