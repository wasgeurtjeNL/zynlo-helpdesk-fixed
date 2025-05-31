import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface SpamRule {
  name: string;
  description: string;
  pattern: RegExp;
  score: number;
}

export class SimpleSpamDetector {
  private rules: SpamRule[] = [];
  private blacklistedDomains: string[] = [];
  private whitelistedDomains: string[] = [];
  private scoreThreshold: number = 5;
  
  constructor() {
    this.initializeRules();
    this.initializeDomains();
  }

  private initializeRules() {
    this.rules = [
      // Dutch spam patterns
      {
        name: 'DUTCH_SPAM_WORDS',
        description: 'Common Dutch spam words',
        pattern: /\b(gratis|winnen|prijs|casino|viagra|bitcoin|forex|geld\sverdienen|rijk\sworden|miljonair|loterij|jackpot)\b/gi,
        score: 2
      },
      // English spam patterns
      {
        name: 'ENGLISH_SPAM_WORDS',
        description: 'Common English spam words',
        pattern: /\b(free|winner|prize|casino|viagra|bitcoin|forex|make\smoney|get\srich|millionaire|lottery|jackpot)\b/gi,
        score: 2
      },
      // Excessive capitals
      {
        name: 'EXCESSIVE_CAPS',
        description: 'Too many capital letters',
        pattern: /[A-Z\s]{20,}/,
        score: 1.5
      },
      // Suspicious URLs
      {
        name: 'SUSPICIOUS_LINKS',
        description: 'Suspicious URL shorteners',
        pattern: /\b(bit\.ly|tinyurl|short\.link|click\.here|tiny\.cc|goo\.gl|ow\.ly|t\.co|buff\.ly)\b/gi,
        score: 3
      },
      // Urgency patterns
      {
        name: 'FAKE_URGENCY',
        description: 'Fake urgency language',
        pattern: /\b(urgent|immediately|expire|last\s?chance|act\s?now|limited\s?time|today\s?only|deadline|hurry)\b/gi,
        score: 2
      },
      // Scam patterns
      {
        name: 'NIGERIAN_SCAM',
        description: 'Classic scam patterns',
        pattern: /\b(nigerian?\s?prince|inheritance|deceased\s?relative|bank\s?transfer|million\s?(dollars?|euros?)|beneficiary)\b/gi,
        score: 5
      },
      // Phishing
      {
        name: 'PHISHING_PATTERNS',
        description: 'Phishing attempt patterns',
        pattern: /\b(verify\s?your\s?account|suspended\s?account|click\s?to\s?verify|update\s?payment|confirm\s?identity|security\s?alert)\b/gi,
        score: 4
      },
      // Excessive punctuation
      {
        name: 'EXCESSIVE_PUNCTUATION',
        description: 'Too many exclamation marks',
        pattern: /[!?]{3,}/g,
        score: 1
      },
      // All caps subject
      {
        name: 'ALL_CAPS_TEXT',
        description: 'Text in all capitals',
        pattern: /^[A-Z\s!?]{10,}$/m,
        score: 2
      },
      // Crypto scams
      {
        name: 'CRYPTO_SCAM',
        description: 'Cryptocurrency scams',
        pattern: /\b(crypto|bitcoin|ethereum|binance|coinbase|blockchain)\s*(investment|opportunity|trading|profit|guaranteed)\b/gi,
        score: 3
      },
      // Adult content
      {
        name: 'ADULT_CONTENT',
        description: 'Adult content spam',
        pattern: /\b(sex|porn|xxx|adult|dating|singles|hookup|nude)\b/gi,
        score: 4
      },
      // Medication spam
      {
        name: 'MEDICATION_SPAM',
        description: 'Medication and pills spam',
        pattern: /\b(pills?|medication|prescription|pharmacy|cheap\s?meds?|buy\s?online|weight\s?loss)\b/gi,
        score: 3
      },
      // Money patterns
      {
        name: 'MONEY_PATTERNS',
        description: 'Suspicious money mentions',
        pattern: /\b(\$|€|£)\s*\d+[\d,]*\s*(thousand|million|billion)?\b|\b\d+\s*%\s*off\b/gi,
        score: 1.5
      }
    ];
  }

  private initializeDomains() {
    // Blacklisted domains (known spam sources)
    this.blacklistedDomains = [
      '0815.ru',
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'spam4.me',
      'trashmail.com',
      'yopmail.com',
      'throwaway.email',
      'maildrop.cc',
      'temp-mail.org'
    ];

    // Whitelisted domains (trusted sources)
    this.whitelistedDomains = [
      'gmail.com',
      'outlook.com',
      'hotmail.com',
      'yahoo.com',
      'icloud.com',
      'protonmail.com',
      'live.com',
      'msn.com',
      'aol.com',
      'mail.com'
    ];
  }

  async checkSpam(params: {
    content: string;
    subject?: string;
    from: string;
    html?: string;
  }): Promise<{
    isSpam: boolean;
    score: number;
    report: string;
    matchedRules: string[];
  }> {
    try {
      let totalScore = 0;
      const matchedRules: string[] = [];
      const reports: string[] = [];

      // Check blacklisted domains first
      const fromDomain = params.from.toLowerCase().split('@')[1] || '';
      if (this.blacklistedDomains.some(domain => fromDomain.includes(domain))) {
        return {
          isSpam: true,
          score: 10,
          report: `Email from blacklisted domain: ${fromDomain}`,
          matchedRules: ['BLACKLISTED_DOMAIN']
        };
      }

      // Check if whitelisted (gives -2 score bonus)
      const isWhitelisted = this.whitelistedDomains.some(domain => fromDomain.includes(domain));
      if (isWhitelisted) {
        totalScore -= 2;
        reports.push('Email from trusted domain');
      }

      // Combine subject and content for analysis
      const fullText = `${params.subject || ''} ${params.content}`.toLowerCase();
      
      // Strip HTML if provided
      const textContent = params.html 
        ? params.html.replace(/<[^>]*>/g, ' ').toLowerCase()
        : fullText;

      // Apply all rules
      for (const rule of this.rules) {
        const matches = textContent.match(rule.pattern);
        if (matches && matches.length > 0) {
          totalScore += rule.score * Math.min(matches.length, 3); // Cap at 3 matches per rule
          matchedRules.push(rule.name);
          reports.push(`${rule.description} (${matches.length} matches)`);
        }
      }

      // Additional checks
      // Check for no subject
      if (!params.subject || params.subject.trim().length === 0) {
        totalScore += 1;
        matchedRules.push('NO_SUBJECT');
        reports.push('Email has no subject');
      }

      // Check for very short content
      if (params.content.length < 20) {
        totalScore += 1;
        matchedRules.push('SHORT_CONTENT');
        reports.push('Very short email content');
      }

      // Check for too many links
      const linkMatches = textContent.match(/https?:\/\/[^\s]+/gi);
      if (linkMatches && linkMatches.length > 5) {
        totalScore += 2;
        matchedRules.push('TOO_MANY_LINKS');
        reports.push(`Too many links (${linkMatches.length})`);
      }

      // Final score adjustment
      const finalScore = Math.max(0, totalScore);
      const isSpam = finalScore >= this.scoreThreshold;

      return {
        isSpam,
        score: finalScore,
        report: reports.length > 0 ? reports.join('; ') : 'No spam indicators found',
        matchedRules
      };
    } catch (error) {
      console.error('Spam detection error:', error);
      return {
        isSpam: false,
        score: 0,
        report: `Error during spam check: ${error instanceof Error ? error.message : 'Unknown error'}`,
        matchedRules: []
      };
    }
  }

  async logDetection(params: {
    ticketId?: string;
    messageId?: string;
    emailFrom: string;
    subject?: string;
    spamScore: number;
    isSpam: boolean;
    report: string;
  }): Promise<void> {
    try {
      await supabase.from('spam_detection_logs').insert({
        ticket_id: params.ticketId,
        message_id: params.messageId,
        email_from: params.emailFrom,
        subject: params.subject,
        spam_score: params.spamScore,
        is_spam: params.isSpam,
        detection_report: params.report
      });
    } catch (error) {
      console.error('Failed to log spam detection:', error);
    }
  }

  async trainAsSpam(content: string, userId?: string): Promise<void> {
    try {
      await supabase.from('spam_training_data').insert({
        content,
        is_spam: true,
        trained_by: userId
      });
    } catch (error) {
      console.error('Failed to train spam data:', error);
    }
  }

  async trainAsHam(content: string, userId?: string): Promise<void> {
    try {
      await supabase.from('spam_training_data').insert({
        content,
        is_spam: false,
        trained_by: userId
      });
    } catch (error) {
      console.error('Failed to train ham data:', error);
    }
  }

  // Method to get current threshold
  getThreshold(): number {
    return this.scoreThreshold;
  }

  // Method to update threshold
  setThreshold(threshold: number): void {
    this.scoreThreshold = Math.max(1, Math.min(10, threshold));
  }
}

// Export singleton instance
export const spamDetector = new SimpleSpamDetector(); 