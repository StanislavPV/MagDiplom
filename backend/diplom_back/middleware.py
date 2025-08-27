class SessionInitializationMiddleware:
    """Ensure session is created for all requests"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if session exists and has been processed by SessionMiddleware
        if hasattr(request, 'session'):
            if not request.session.session_key:
                request.session.create()
                print(f"🔧 NEW session created: {request.session.session_key}")
            else:
                print(f"🔧 EXISTING session: {request.session.session_key}")
        else:
            print("⚠️ Session not available in middleware")
            
        response = self.get_response(request)
        
        return response