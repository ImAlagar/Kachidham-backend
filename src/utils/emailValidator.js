export class EmailValidator {
  static isSpamTriggerContent(text) {
    const spamTriggers = [
      /\b(?:buy|cheap|discount|free|guarantee|limited|now|offer|price|promo|save|special)\b/gi,
      /[A-Z]{4,}/g, // Too many uppercase letters
      /!!!+/g, // Multiple exclamation marks
      /\$\$\$+/g, // Multiple dollar signs
      /<script>/gi, // Script tags
      /javascript:/gi // JavaScript links
    ];
    
    return spamTriggers.some(regex => regex.test(text));
  }

  static validateEmailContent(subject, html, text) {
    const warnings = [];
    
    // Check subject
    if (subject.length > 100) {
      warnings.push('Subject too long');
    }
    
    if (subject.match(/[!]{2,}/g)) {
      warnings.push('Too many exclamation marks in subject');
    }
    
    // Check for spam triggers
    const fullContent = subject + ' ' + html + ' ' + text;
    if (this.isSpamTriggerContent(fullContent)) {
      warnings.push('Content contains spam triggers');
    }
    
    // Check HTML to text ratio
    const textLength = text.length;
    const htmlLength = html.replace(/<[^>]*>/g, '').length;
    
    if (textLength === 0) {
      warnings.push('No text version provided');
    }
    
    return warnings;
  }
}