// Shared TypeScript types matching the Prisma schema

export interface Exam {
  id: string;
  name: string;
  slug: string;
  description?: string;
  banner?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  subjects?: Subject[];
  plans?: SubscriptionPlan[];
  faqs?: FAQ[];
  seo?: SEOMeta;
  _count?: { subjects: number; pdfs: number; quizzes: number };
}

export interface Subject {
  id: string;
  examId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  isActive: boolean;
  sortOrder: number;
  exam?: Pick<Exam, 'id' | 'name' | 'slug'>;
  topics?: Topic[];
  _count?: { pdfs: number; quizzes: number };
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface PDF {
  id: string;
  examId?: string;
  subjectId?: string;
  title: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  totalPages?: number;
  fileSize?: number;
  language: 'ENGLISH' | 'HINDI' | 'BILINGUAL';
  version: string;
  author?: string;
  publishedAt?: string;
  tags: string[];
  freePreviewPages: number;
  requiresSubscription: boolean;
  allowDownload: boolean;
  watermarkText?: string;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  exam?: Pick<Exam, 'id' | 'name' | 'slug'>;
  subject?: Pick<Subject, 'id' | 'name'>;
  seo?: SEOMeta;
}

export interface PDFAccess {
  id: string;
  userId: string;
  pdfId: string;
  lastPage: number;
  readingProgress: number;
  isUnlocked: boolean;
  lastAccessAt: string;
  pdf?: Pick<PDF, 'id' | 'title' | 'slug' | 'thumbnailUrl' | 'totalPages'>;
}

export interface Quiz {
  id: string;
  examId?: string;
  subjectId?: string;
  topicId?: string;
  title: string;
  slug: string;
  description?: string;
  type: 'TOPIC_QUIZ' | 'SUBJECT_QUIZ' | 'FULL_EXAM_QUIZ' | 'MOCK_TEST' | 'DAILY_QUIZ' | 'WEEKLY_QUIZ';
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  negativeMarking: boolean;
  negativeMarkValue: number;
  requiresSubscription: boolean;
  isFeatured: boolean;
  publishedAt?: string;
  exam?: Pick<Exam, 'id' | 'name' | 'slug'>;
  subject?: Pick<Subject, 'id' | 'name'>;
  _count?: { quizQuestions: number; attempts: number };
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  questionImage?: string;
  type: 'MCQ' | 'MULTIPLE_CORRECT' | 'TRUE_FALSE' | 'FILL_BLANKS' | 'IMAGE_QUESTION';
  marks: number;
  negativeMarks: number;
  categoryId?: string;
  categoryName?: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  optionText: string;
  optionImage?: string;
  sortOrder: number;
  isCorrect?: boolean; // only in results
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  startedAt: string;
  completedAt?: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  rank?: number;
  timeTakenSeconds?: number;
}

export interface SubscriptionPlan {
  id: string;
  examId?: string;
  name: string;
  description?: string;
  type: 'EXAM_PACK' | 'SUBJECT_PACK' | 'PDF_ONLY' | 'PREMIUM' | 'CUSTOM';
  duration: 'ONE_MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'TWELVE_MONTHS' | 'LIFETIME';
  durationDays: number;
  originalPrice: number;
  discountedPrice: number;
  gstPercent: number;
  features: string[];
  isActive: boolean;
  isFeatured: boolean;
  exam?: Pick<Exam, 'id' | 'name'>;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  startDate: string;
  endDate: string;
  isLifetime: boolean;
  plan?: SubscriptionPlan;
  payment?: Pick<Payment, 'id' | 'finalAmount' | 'status' | 'createdAt'>;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  gstAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  provider: string;
  providerOrderId?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  imageUrl?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface UserNotification {
  id: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  notification: Notification;
}

export interface SEOMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  role: string;
  status: string;
  avatar?: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  subscriptions?: Subscription[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
