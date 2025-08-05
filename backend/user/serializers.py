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
       