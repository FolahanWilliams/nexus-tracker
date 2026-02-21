// Validation utilities for user inputs
export const ValidationRules = {
  taskTitle: {
    maxLength: 200,
    minLength: 1,
    pattern: /^[\w\s\-_!@#$%^&*()+=\[\]{}|;':",.'?]*$/,
  },
  characterName: {
    maxLength: 50,
    minLength: 1,
    pattern: /^[\w\s\-_]*$/,
  },
  motto: {
    maxLength: 100,
  },
  strengths: {
    maxLength: 200,
  },
  shopItemName: {
    maxLength: 100,
    minLength: 1,
  },
  goalTitle: {
    maxLength: 150,
    minLength: 1,
  },
  goalDescription: {
    maxLength: 500,
  },
  habitName: {
    maxLength: 100,
    minLength: 1,
  },
  timelineEventName: {
    maxLength: 100,
    minLength: 1,
  },
  timelineSubject: {
    maxLength: 100,
  },
};

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateTaskTitle(title: string): string {
  const trimmed = title.trim();
  
  if (trimmed.length < ValidationRules.taskTitle.minLength) {
    throw new ValidationError('Task title cannot be empty', 'title');
  }
  
  if (trimmed.length > ValidationRules.taskTitle.maxLength) {
    throw new ValidationError(`Task title must be ${ValidationRules.taskTitle.maxLength} characters or less`, 'title');
  }
  
  if (!ValidationRules.taskTitle.pattern.test(trimmed)) {
    throw new ValidationError('Task title contains invalid characters', 'title');
  }
  
  // XSS prevention - basic sanitization
  return sanitizeInput(trimmed);
}

export function validateCharacterName(name: string): string {
  const trimmed = name.trim();
  
  if (trimmed.length < ValidationRules.characterName.minLength) {
    throw new ValidationError('Character name cannot be empty', 'name');
  }
  
  if (trimmed.length > ValidationRules.characterName.maxLength) {
    throw new ValidationError(`Character name must be ${ValidationRules.characterName.maxLength} characters or less`, 'name');
  }
  
  if (!ValidationRules.characterName.pattern.test(trimmed)) {
    throw new ValidationError('Character name contains invalid characters', 'name');
  }
  
  return sanitizeInput(trimmed);
}

export function validateMotto(motto: string): string {
  if (motto.length > ValidationRules.motto.maxLength) {
    throw new ValidationError(`Motto must be ${ValidationRules.motto.maxLength} characters or less`, 'motto');
  }
  return sanitizeInput(motto);
}

export function validateStrengths(strengths: string): string {
  if (strengths.length > ValidationRules.strengths.maxLength) {
    throw new ValidationError(`Strengths must be ${ValidationRules.strengths.maxLength} characters or less`, 'strengths');
  }
  return sanitizeInput(strengths);
}

export function validateShopItemName(name: string): string {
  const trimmed = name.trim();
  
  if (trimmed.length < ValidationRules.shopItemName.minLength) {
    throw new ValidationError('Item name cannot be empty', 'name');
  }
  
  if (trimmed.length > ValidationRules.shopItemName.maxLength) {
    throw new ValidationError(`Item name must be ${ValidationRules.shopItemName.maxLength} characters or less`, 'name');
  }
  
  return sanitizeInput(trimmed);
}

export function validateGoalTitle(title: string): string {
  const trimmed = title.trim();
  
  if (trimmed.length < ValidationRules.goalTitle.minLength) {
    throw new ValidationError('Goal title cannot be empty', 'title');
  }
  
  if (trimmed.length > ValidationRules.goalTitle.maxLength) {
    throw new ValidationError(`Goal title must be ${ValidationRules.goalTitle.maxLength} characters or less`, 'title');
  }
  
  return sanitizeInput(trimmed);
}

export function validateGoalDescription(description: string): string {
  if (description.length > ValidationRules.goalDescription.maxLength) {
    throw new ValidationError(`Description must be ${ValidationRules.goalDescription.maxLength} characters or less`, 'description');
  }
  return sanitizeInput(description);
}

export function validateHabitName(name: string): string {
  const trimmed = name.trim();
  
  if (trimmed.length < ValidationRules.habitName.minLength) {
    throw new ValidationError('Habit name cannot be empty', 'name');
  }
  
  if (trimmed.length > ValidationRules.habitName.maxLength) {
    throw new ValidationError(`Habit name must be ${ValidationRules.habitName.maxLength} characters or less`, 'name');
  }
  
  return sanitizeInput(trimmed);
}

export function validateTimelineEventName(name: string): string {
  const trimmed = name.trim();
  
  if (trimmed.length < ValidationRules.timelineEventName.minLength) {
    throw new ValidationError('Event name cannot be empty', 'name');
  }
  
  if (trimmed.length > ValidationRules.timelineEventName.maxLength) {
    throw new ValidationError(`Event name must be ${ValidationRules.timelineEventName.maxLength} characters or less`, 'name');
  }
  
  return sanitizeInput(trimmed);
}

export function validateTimelineSubject(subject: string): string {
  if (subject.length > ValidationRules.timelineSubject.maxLength) {
    throw new ValidationError(`Subject must be ${ValidationRules.timelineSubject.maxLength} characters or less`, 'subject');
  }
  return sanitizeInput(subject);
}

// Basic XSS sanitization
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Cost validation
export function validateCost(cost: number): number {
  if (isNaN(cost) || cost < 0) {
    throw new ValidationError('Cost must be a positive number', 'cost');
  }
  if (cost > 1000000) {
    throw new ValidationError('Cost cannot exceed 1,000,000', 'cost');
  }
  return Math.floor(cost);
}

// XP/Gold amount validation
export function validateAmount(amount: number): number {
  if (isNaN(amount)) {
    throw new ValidationError('Amount must be a valid number', 'amount');
  }
  if (Math.abs(amount) > 1000000) {
    throw new ValidationError('Amount cannot exceed 1,000,000', 'amount');
  }
  return Math.floor(amount);
}
