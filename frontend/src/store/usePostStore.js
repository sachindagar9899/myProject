import { create } from 'zustand';
import axios from 'axios';

const usePostStore = create((set, get) => ({
  posts: [],
  loading: false,
  error: null,

  fetchFeed: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/posts/feed', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ posts: res.data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch feed', loading: false });
    }
  },

  createPost: async (formData) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/posts', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          // Let browser set content-type for multipart/form-data if it's FormData
          ...(formData instanceof FormData ? {} : { 'Content-Type': 'application/json' })
        }
      });
      // Add new post to the top of the feed
      set((state) => ({ posts: [res.data, ...state.posts], loading: false }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to create post', loading: false });
      return false;
    }
  },

  likePost: async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      set((state) => ({
        posts: state.posts.map(post => 
          post._id === postId ? { ...post, likes: res.data.likes } : post
        )
      }));
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  },

  addComment: async (postId, text) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/posts/${postId}/comment`, { text }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state with new comments array
      set((state) => ({
        posts: state.posts.map(post => 
          post._id === postId ? { ...post, comments: res.data.comments } : post
        )
      }));
      return true;
    } catch (err) {
      console.error('Failed to add comment:', err);
      return false;
    }
  }
}));

export default usePostStore;
