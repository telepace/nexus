// Test script to verify language parameter passing to API
const testLanguageAPI = async () => {
    const apiUrl = 'http://127.0.0.1:8000';
    
    // Simulate browser language detection
    const detectLocale = () => {
        // This simulates the frontend detectLocale function
        const supportedLocales = ['en', 'zh'];
        const defaultLocale = 'en';
        
        // For testing, let's simulate English detection
        const browserLang = 'en'; // Simulating English browser
        return supportedLocales.includes(browserLang) ? browserLang : defaultLocale;
    };
    
    const locale = detectLocale();
    const outputLanguage = locale === 'en' ? 'English' : 'Chinese';
    
    console.log('🌐 Testing with:', { locale, outputLanguage });
    
    // First, we need to get an access token (this would normally be handled by auth)
    // For testing, let's just make a simple health check to see if the server is running
    try {
        const healthResponse = await fetch(`${apiUrl}/api/v1/health`);
        if (healthResponse.ok) {
            console.log('✅ Backend server is running');
            
            // Let's examine what the request body would look like
            const requestBody = {
                analysis_instruction: "Please summarize this content",
                output_language: outputLanguage
            };
            
            console.log('📤 Request body that would be sent:', JSON.stringify(requestBody, null, 2));
            console.log('🔍 The output_language field:', requestBody.output_language);
            
        } else {
            console.log('❌ Backend server health check failed');
        }
    } catch (error) {
        console.error('❌ Error testing API:', error);
    }
};

// Run the test
testLanguageAPI();