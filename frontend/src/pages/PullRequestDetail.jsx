import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GitPullRequest, GitMerge, MessageSquare, AlertCircle, ArrowLeft, GitBranch, Plus, Minus, FileCode, ChevronDown, ChevronRight } from 'lucide-react';
import Markdown from '../components/Markdown';
import { formatDate, getInitials, getAvatarColor, getToken } from '../components/Layout';

const DiffView = ({ file }) => {
  const [collapsed, setCollapsed] = useState(false);
  
  if (!file.patch) {
    return (
      <div className="rounded-md border overflow-hidden mb-4" style={{ borderColor: '#d0d7de' }}>
        <div 
          className="px-4 py-2 text-sm flex items-center justify-between cursor-pointer"
          style={{ backgroundColor: '#f6f8fa', borderColor: '#d0d7de' }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <FileCode size={14} style={{ color: '#656d76' }} />
            <span className="font-mono text-xs" style={{ color: '#1f2328' }}>{file.filename}</span>
            <span 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: file.status === 'added' ? '#dafbe1' : file.status === 'removed' ? '#ffebe9' : '#ddf4ff',
                color: file.status === 'added' ? '#1a7f37' : file.status === 'removed' ? '#cf222e' : '#0969da'
              }}
            >
              {file.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: '#1a7f37' }}>+{file.additions}</span>
            <span style={{ color: '#cf222e' }}>-{file.deletions}</span>
          </div>
        </div>
        <div className="p-4 text-sm text-center" style={{ backgroundColor: '#ffffff', color: '#656d76' }}>
          Binary file or diff too large to display
        </div>
      </div>
    );
  }

  const lines = file.patch.split('\n');

  return (
    <div className="rounded-md border overflow-hidden mb-4" style={{ borderColor: '#d0d7de' }}>
      <div 
        className="px-4 py-2 text-sm flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
        style={{ backgroundColor: '#f6f8fa' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <FileCode size={14} style={{ color: '#656d76' }} />
          <span className="font-mono text-xs" style={{ color: '#1f2328' }}>{file.filename}</span>
          <span 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: file.status === 'added' ? '#dafbe1' : file.status === 'removed' ? '#ffebe9' : '#ddf4ff',
              color: file.status === 'added' ? '#1a7f37' : file.status === 'removed' ? '#cf222e' : '#0969da'
            }}
          >
            {file.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: '#1a7f37' }}>+{file.additions}</span>
          <span style={{ color: '#cf222e' }}>-{file.deletions}</span>
        </div>
      </div>
      
      {!collapsed && (
        <div className="overflow-x-auto" style={{ backgroundColor: '#ffffff' }}>
          <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {lines.map((line, idx) => {
                const isAddition = line.startsWith('+') && !line.startsWith('+++');
                const isDeletion = line.startsWith('-') && !line.startsWith('---');
                const isHunk = line.startsWith('@@');
                
                let bgColor = 'transparent';
                let textColor = '#1f2328';
                
                if (isAddition) {
                  bgColor = '#dafbe1';
                  textColor = '#1a7f37';
                } else if (isDeletion) {
                  bgColor = '#ffebe9';
                  textColor = '#cf222e';
                } else if (isHunk) {
                  bgColor = '#ddf4ff';
                  textColor = '#0969da';
                }
                
                return (
                  <tr key={idx} style={{ backgroundColor: bgColor }}>
                    <td 
                      className="px-2 py-0.5 text-right select-none border-r"
                      style={{ color: '#656d76', borderColor: '#d0d7de', width: '1%', whiteSpace: 'nowrap' }}
                    >
                      {!isHunk && idx + 1}
                    </td>
                    <td 
                      className="px-2 py-0.5 select-none"
                      style={{ width: '1%', whiteSpace: 'nowrap' }}
                    >
                      {isAddition && <Plus size={10} style={{ color: '#1a7f37' }} />}
                      {isDeletion && <Minus size={10} style={{ color: '#cf222e' }} />}
                    </td>
                    <td 
                      className="px-2 py-0.5 whitespace-pre"
                      style={{ color: textColor }}
                    >
                      {line}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const PullRequestDetail = () => {
  const { owner, repo, prNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('conversation'); // conversation, files

  useEffect(() => {
    fetchPR();
  }, [owner, repo, prNumber]);

  const fetchPR = async () => {
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
        `/api/pulls/${owner}/${repo}/${prNumber}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch pull request');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPRIcon = () => {
    if (!data) return null;
    if (data.pull_request.merged_at) {
      return <GitMerge size={16} />;
    }
    return <GitPullRequest size={16} />;
  };

  const getPRStatus = () => {
    if (!data) return '';
    if (data.pull_request.merged_at) return 'Merged';
    if (data.pull_request.state === 'open') return 'Open';
    return 'Closed';
  };

  const getStatusColor = () => {
    if (!data) return {};
    if (data.pull_request.merged_at) return { backgroundColor: '#8250df', color: '#ffffff' };
    if (data.pull_request.state === 'open') return { backgroundColor: '#1f883d', color: '#ffffff' };
    return { backgroundColor: '#cf222e', color: '#ffffff' };
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p style={{ color: '#656d76' }}>Loading pull request...</p>
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

  const pr = data.pull_request;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm flex items-center gap-2" style={{ color: '#656d76' }}>
        <Link 
          to={`/${owner}/${repo}/pulls`} 
          className="flex items-center gap-1 hover:underline" 
          style={{ color: '#0969da' }}
        >
          <ArrowLeft size={14} /> Back to pull requests
        </Link>
      </div>

      {/* PR Header */}
      <div className="mb-4 pb-4 border-b" style={{ borderColor: '#d0d7de' }}>
        <h1 className="text-3xl mb-2" style={{ color: '#1f2328', fontWeight: 400 }}>
          {pr.title}
          <span style={{ color: '#656d76', fontWeight: 300 }}> #{pr.number}</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
            style={getStatusColor()}
          >
            {getPRIcon()}
            {getPRStatus()}
          </span>
          <span className="text-sm" style={{ color: '#656d76' }}>
            <span className="font-semibold" style={{ color: '#1f2328' }}>{pr.user_login}</span>
            {' '}wants to merge into{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: '#ddf4ff', color: '#0969da' }}>
              <GitBranch size={10} /> {pr.base_ref}
            </span>
            {' '}from{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: '#ddf4ff', color: '#0969da' }}>
              <GitBranch size={10} /> {pr.head_ref}
            </span>
          </span>
        </div>
        
        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: '#656d76' }}>
          <span style={{ color: '#1a7f37' }}>+{pr.additions}</span>
          <span style={{ color: '#cf222e' }}>-{pr.deletions}</span>
          <span>{pr.changed_files} file{pr.changed_files !== 1 && 's'} changed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: '#d0d7de' }}>
        <button
          onClick={() => setActiveTab('conversation')}
          className="px-4 py-2 text-sm font-medium transition-colors relative"
          style={{ 
            color: activeTab === 'conversation' ? '#1f2328' : '#656d76',
            borderBottom: activeTab === 'conversation' ? '2px solid #fd8c73' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          <MessageSquare size={14} className="inline mr-1.5" />
          Conversation
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#f6f8fa' }}>
            {data.comments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className="px-4 py-2 text-sm font-medium transition-colors relative"
          style={{ 
            color: activeTab === 'files' ? '#1f2328' : '#656d76',
            borderBottom: activeTab === 'files' ? '2px solid #fd8c73' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          <FileCode size={14} className="inline mr-1.5" />
          Files changed
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#f6f8fa' }}>
            {data.files.length}
          </span>
        </button>
      </div>

      {/* Conversation Tab */}
      {activeTab === 'conversation' && (
        <div className="flex gap-4">
          <div className="hidden md:block w-10 flex-shrink-0">
            <div className="sticky top-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: getAvatarColor(pr.user_login) }}
              >
                {getInitials(pr.user_login)}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* PR Body */}
            <div className="rounded-md border mb-6 overflow-hidden" style={{ borderColor: '#d0d7de' }}>
              <div 
                className="px-4 py-2 text-sm flex items-center justify-between border-b"
                style={{ backgroundColor: '#ddf4ff', borderColor: '#d0d7de', color: '#1f2328' }}
              >
                <span>
                  <span className="font-semibold">{pr.user_login}</span>
                  <span style={{ color: '#656d76' }}> commented {formatDate(pr.created_at)}</span>
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
                <Markdown>{pr.body || '*No description provided.*'}</Markdown>
              </div>
            </div>

            {/* Comments */}
            {data.comments.length > 0 && (
              <div className="space-y-4">
                {data.comments.map((comment) => (
                  <div key={`${comment.user_login}-${comment.created_at}`} className="flex gap-4">
                    <div 
                      className="hidden md:flex w-10 h-10 rounded-full items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(comment.user_login) }}
                    >
                      {getInitials(comment.user_login)}
                    </div>
                    
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

            {data.comments.length === 0 && (
              <div className="text-center py-8 rounded-md border" style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff' }}>
                <MessageSquare size={24} style={{ color: '#656d76' }} className="mx-auto mb-2" />
                <p style={{ color: '#656d76' }}>No comments yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div>
          {/* File Summary */}
          <div className="mb-4 p-3 rounded-md border text-sm" style={{ borderColor: '#d0d7de', backgroundColor: '#f6f8fa' }}>
            <span style={{ color: '#1f2328' }}>
              Showing <strong>{data.files.length}</strong> changed file{data.files.length !== 1 && 's'} with{' '}
              <strong style={{ color: '#1a7f37' }}>{pr.additions} additions</strong> and{' '}
              <strong style={{ color: '#cf222e' }}>{pr.deletions} deletions</strong>
            </span>
          </div>
          
          {/* File Diffs */}
          {data.files.map((file) => (
            <DiffView key={file.filename} file={file} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PullRequestDetail;

