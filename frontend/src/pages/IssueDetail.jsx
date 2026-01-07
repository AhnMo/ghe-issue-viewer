import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CircleDot, GitPullRequestClosed, MessageSquare, AlertCircle, ArrowLeft } from 'lucide-react';
import Markdown from '../components/Markdown';
import { formatDate, getInitials, getAvatarColor, getToken } from '../components/Layout';

const IssueDetail = () => {
  const { owner, repo, issueNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIssue();
  }, [owner, repo, issueNumber]);

  const fetchIssue = async () => {
    const token = getToken();
    if (!token) {
      setError('Please set your PAT token first (click "Set Token" in the header)');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/issues/${owner}/${repo}/${issueNumber}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch issue');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p style={{ color: '#656d76' }}>Loading issue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 rounded-md border flex items-center gap-3" style={{ backgroundColor: '#ffebe9', borderColor: '#ff8182', color: '#cf222e' }}>
        <AlertCircle size={20} />
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm flex items-center gap-2" style={{ color: '#656d76' }}>
        <Link 
          to={`/${owner}/${repo}/issues`} 
          className="flex items-center gap-1 hover:underline" 
          style={{ color: '#0969da' }}
        >
          <ArrowLeft size={14} /> Back to issues
        </Link>
      </div>

      {/* Issue Header */}
      <div className="mb-4 pb-4 border-b" style={{ borderColor: '#d0d7de' }}>
        <h1 className="text-3xl mb-2" style={{ color: '#1f2328', fontWeight: 400 }}>
          {data.issue.title}
          <span style={{ color: '#656d76', fontWeight: 300 }}> #{data.issue.number}</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* State Badge */}
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
            style={data.issue.state === 'open' 
              ? { backgroundColor: '#1f883d', color: '#ffffff' }
              : { backgroundColor: '#8250df', color: '#ffffff' }
            }
          >
            {data.issue.state === 'open' 
              ? <CircleDot size={16} /> 
              : <GitPullRequestClosed size={16} />
            }
            {data.issue.state === 'open' ? 'Open' : 'Closed'}
          </span>
          <span className="text-sm" style={{ color: '#656d76' }}>
            <span className="font-semibold" style={{ color: '#1f2328' }}>{data.issue.user_login}</span>
            {' '}opened this issue {formatDate(data.issue.created_at)} · {data.comments.length} comment{data.comments.length !== 1 && 's'}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex gap-4">
        {/* Timeline Line */}
        <div className="hidden md:block w-10 flex-shrink-0">
          <div className="sticky top-4">
            {/* Author Avatar */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: getAvatarColor(data.issue.user_login) }}
            >
              {getInitials(data.issue.user_login)}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Issue Body */}
          <div className="rounded-md border mb-6 overflow-hidden" style={{ borderColor: '#d0d7de' }}>
            <div 
              className="px-4 py-2 text-sm flex items-center justify-between border-b"
              style={{ backgroundColor: '#ddf4ff', borderColor: '#d0d7de', color: '#1f2328' }}
            >
              <span>
                <span className="font-semibold">{data.issue.user_login}</span>
                <span style={{ color: '#656d76' }}> commented {formatDate(data.issue.created_at)}</span>
              </span>
              <span 
                className="text-xs px-2 py-0.5 rounded-full border font-medium"
                style={{ borderColor: '#d0d7de', color: '#656d76' }}
              >
                Author
              </span>
            </div>
            <div 
              className="p-4 prose prose-sm max-w-none"
              style={{ backgroundColor: '#ffffff', color: '#1f2328' }}
            >
              <Markdown>{data.issue.body || '*No description provided.*'}</Markdown>
            </div>
          </div>

          {/* Comments */}
          {data.comments.length > 0 && (
            <div className="space-y-4">
              {data.comments.map((comment) => (
                <div key={`${comment.user_login}-${comment.created_at}`} className="flex gap-4">
                  {/* Comment Avatar */}
                  <div 
                    className="hidden md:flex w-10 h-10 rounded-full items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(comment.user_login) }}
                  >
                    {getInitials(comment.user_login)}
                  </div>
                  
                  {/* Comment Box */}
                  <div className="flex-1 min-w-0 rounded-md border overflow-hidden" style={{ borderColor: '#d0d7de' }}>
                    <div 
                      className="px-4 py-2 text-sm border-b flex items-center"
                      style={{ backgroundColor: '#f6f8fa', borderColor: '#d0d7de' }}
                    >
                      <span className="font-semibold" style={{ color: '#1f2328' }}>{comment.user_login}</span>
                      <span className="ml-1" style={{ color: '#656d76' }}>commented {formatDate(comment.created_at)}</span>
                    </div>
                    <div 
                      className="p-4 prose prose-sm max-w-none"
                      style={{ backgroundColor: '#ffffff', color: '#1f2328' }}
                    >
                      <Markdown>{comment.body || '*No content.*'}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No comments */}
          {data.comments.length === 0 && (
            <div className="text-center py-8 rounded-md border" style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff' }}>
              <MessageSquare size={24} style={{ color: '#656d76' }} className="mx-auto mb-2" />
              <p style={{ color: '#656d76' }}>No comments yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;

