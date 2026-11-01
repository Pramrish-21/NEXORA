export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  followers_count?: number;
  following_count?: number;
  is_verified?: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  filter?: string;
  profiles?: Profile;
  likes_count?: number;
  user_has_liked?: boolean;
  saved?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at?: string;
}

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  thumbnail?: string;
}

export interface Story {
  id: string;
  user_id: string;
  image_url: string;
  user: Profile;
  created_at: string;
  viewed?: boolean;
}
