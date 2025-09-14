const logger = require('../../utils/logger');

class ValidatePromptTool {
  constructor() {
    this.name = 'validatePrompt';
    this.description = 'Validates user prompts for real estate relevance and safety';
    this.parameters = {
      prompt: { type: 'string', required: true, description: 'The user prompt to validate' }
    };
  }

  async execute(params) {
    const { prompt } = params;
    
    try {
      // Basic validation rules
      const validation = {
        isValid: true,
        reason: '',
        confidence: 1.0,
        suggestions: []
      };

      // Check if prompt is empty or too short
      if (!prompt || prompt.trim().length < 2) {
        validation.isValid = false;
        validation.reason = 'Prompt is too short or empty';
        validation.suggestions = ['Please provide a more detailed question about real estate'];
        return validation;
      }

      // Check for inappropriate content
      const inappropriatePatterns = [
        /\b(hack|exploit|attack|malicious|virus|malware)\b/i,
        /\b(illegal|fraud|scam|cheat)\b/i,
        /\b(personal\s+info|ssn|social\s+security|credit\s+card)\b/i
      ];

      for (const pattern of inappropriatePatterns) {
        if (pattern.test(prompt)) {
          validation.isValid = false;
          validation.reason = 'Prompt contains inappropriate content';
          validation.suggestions = ['Please ask questions related to real estate, properties, or mortgages'];
          return validation;
        }
      }

      // Check for real estate relevance
      const realEstateKeywords = [
        'property', 'house', 'home', 'apartment', 'condo', 'real estate',
        'mortgage', 'loan', 'buy', 'sell', 'rent', 'lease', 'investment',
        'market', 'price', 'value', 'location', 'neighborhood', 'area',
        'bedroom', 'bathroom', 'square feet', 'sqft', 'garage', 'yard',
        'financing', 'down payment', 'interest rate', 'closing', 'inspection',
        'agent', 'broker', 'listing', 'mls', 'appraisal', 'equity'
      ];

      const hasRealEstateKeywords = realEstateKeywords.some(keyword => 
        prompt.toLowerCase().includes(keyword)
      );

      // Check for general conversational patterns that might be real estate related
      const conversationalPatterns = [
        /\b(how many|what|where|when|why|can you|help me|tell me|show me|find|search|calculate|compare)\b/i,
        /\b(looking for|interested in|want to|need to|planning to)\b/i,
        /\b(first time|budget|afford|qualify|recommend|suggest)\b/i
      ];

      const hasConversationalPattern = conversationalPatterns.some(pattern => 
        pattern.test(prompt)
      );

      // If no real estate keywords but has conversational pattern, it might still be valid
      if (!hasRealEstateKeywords && hasConversationalPattern) {
        validation.confidence = 0.7;
        validation.suggestions = [
          'I can help with property searches, mortgage calculations, and real estate advice',
          'Try asking about properties in a specific area or mortgage calculations'
        ];
      } else if (!hasRealEstateKeywords && !hasConversationalPattern) {
        validation.isValid = false;
        validation.reason = 'Prompt does not appear to be related to real estate';
        validation.suggestions = [
          'I specialize in real estate. Ask me about properties, mortgages, or market information',
          'Try: "Show me houses in [location]" or "Calculate mortgage for $X"'
        ];
        return validation;
      }

      // Check prompt length (too long might be spam or irrelevant)
      if (prompt.length > 1000) {
        validation.isValid = false;
        validation.reason = 'Prompt is too long';
        validation.suggestions = ['Please keep your questions concise and focused'];
        return validation;
      }

      // Additional validation for specific patterns
      if (prompt.toLowerCase().includes('units available') || 
          prompt.toLowerCase().includes('how many units')) {
        validation.confidence = 0.9;
        validation.suggestions = [
          'I can help you find available properties in specific areas',
          'Would you like me to search for properties in a particular location?'
        ];
      }

      logger.info(`Prompt validation completed: ${validation.isValid ? 'VALID' : 'INVALID'}`);
      return validation;

    } catch (error) {
      logger.error('Error validating prompt:', error);
      return {
        isValid: false,
        reason: 'Error occurred during validation',
        confidence: 0.0,
        suggestions: ['Please try rephrasing your question']
      };
    }
  }
}

module.exports = ValidatePromptTool;