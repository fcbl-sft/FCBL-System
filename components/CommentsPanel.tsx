import React, { useState } from 'react';
import { Comment, UserRole } from '../types';
import { Send, UserCircle, MessageSquare } from 'lucide-react';

interface CommentsPanelProps {
  comments: Comment[];
  currentUserRole: UserRole;
  onAddComment: (text: string) => void;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ comments, currentUserRole, onAddComment }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shadow-xl">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> 
          Feedback & Comments
        </h3>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {comments.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-10">
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => (
            <div 
              key={comment.id} 
              className={`flex flex-col ${comment.role === currentUserRole ? 'items-end' : 'items-start'}`}
            >
              <div className={`
                max-w-[90%] rounded-lg p-3 text-sm shadow-sm
                ${comment.role === currentUserRole 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                }
              `}>
                <p>{comment.text}</p>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 uppercase font-bold">
                 {comment.role !== currentUserRole && <UserCircle className="w-3 h-3" />}
                 <span>{comment.role}</span>
                 <span>•</span>
                 <span>{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200">
        <div className="relative">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 pr-10 text-sm focus:ring-1 focus:ring-black focus:border-black resize-none"
            rows={3}
            placeholder="Type a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                }
            }}
          />
          <button 
            type="submit"
            disabled={!newComment.trim()}
            className="absolute bottom-3 right-3 text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentsPanel;