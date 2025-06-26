export interface ContentItem {
  title: string;
  content: string;
  content_type: 'blog' | 'book' | 'other';
  source_url?: string;
  author?: string;
  user_id?: string;
}
