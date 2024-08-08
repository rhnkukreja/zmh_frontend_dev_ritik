export type EngagementQuestions = {
  id: number;
  engagement_questions_id: string;
  active: boolean;
  type_of_engagement: string;
  engagement_date: Date;
  source: string;
  category: string;
  engagement_question: string;
  other_comments: string;
  date_created: Date;
  date_updated: Date;
  institution: number;
  institution_name: string;
  company_name: string;
  company: number;
};

export type EngagementFormData = {
  active: boolean;
  engagement_date: string;
  engagement_question: string;
  other_comments: string;
  institution: number | null;
  company: number | null;
  type_of_engagement: string | null;
  source: string;
  category: string;
};
