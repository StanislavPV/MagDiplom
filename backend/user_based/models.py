import numpy as np
from sklearn.decomposition import TruncatedSVD

class SVDRecommender:
    def __init__(self, n_components=50, random_state=42):
        self.n_components = n_components
        self.random_state = random_state
        self.svd = TruncatedSVD(n_components=n_components, random_state=random_state)
        self.user_mean = None
        self.is_fitted = False
        
    def fit(self, user_item_matrix):
        """
        Train the SVD model
        """
        print("Training SVD model...")
        
        # Calculate user means for centering
        self.user_mean = np.array([
            row[row > 0].mean() if len(row[row > 0]) > 0 else 0 
            for row in user_item_matrix
        ])
        
        # Mean-center the matrix
        centered_matrix = user_item_matrix.copy()
        for i in range(len(centered_matrix)):
            mask = centered_matrix[i] > 0
            if mask.any():
                centered_matrix[i][mask] -= self.user_mean[i]
        
        # Apply SVD
        self.user_factors = self.svd.fit_transform(centered_matrix)
        self.item_factors = self.svd.components_.T
        
        # Reconstruct the matrix
        self.reconstructed = np.dot(self.user_factors, self.item_factors.T)
        
        # Add back user means
        for i in range(len(self.reconstructed)):
            self.reconstructed[i] += self.user_mean[i]
        
        self.is_fitted = True
        print(f"Model trained with {self.n_components} components")
        print(f"Explained variance ratio: {self.svd.explained_variance_ratio_.sum():.4f}")
        
    def predict(self, user_idx, item_idx):
        """
        Predict rating for a user-item pair
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        prediction = self.reconstructed[user_idx, item_idx]
        return np.clip(prediction, 1, 5)  # Ensure prediction is within valid range
    
    def recommend_items(self, user_idx, user_item_matrix, n_recommendations=10):
        """
        Recommend items for a user
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making recommendations")
        
        # Get user's ratings
        user_ratings = user_item_matrix[user_idx]
        
        # Get items user hasn't rated
        unrated_items = np.where(user_ratings == 0)[0]
        
        # Predict ratings for unrated items
        predictions = []
        for item_idx in unrated_items:
            pred_rating = self.predict(user_idx, item_idx)
            predictions.append((item_idx, pred_rating))
        
        # Sort by predicted rating
        predictions.sort(key=lambda x: x[1], reverse=True)
        
        return predictions[:n_recommendations]