import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GitCommit, AlertCircle, ArrowLeft, Plus, Minus, FileCode } from 'lucide-react';
import Markdown from '../components/Markdown';
import DiffView from '../components/DiffView';
import { formatDate, getInitials, getAvatarColor, getToken } from '../components/Layout';

const CommitDetail = () => {
  const { owner, repo, commitSha } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCommit();
  }, [owner, repo, commitSha]);

  const fetchCommit = async () => {
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
        `/api/commits/${owner}/${repo}/${commitSha}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch commit');
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
        <p style={{ color: '#656d76' }}>Loading commit...</p>
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

  const commit = data.commit;
  const titleLine = commit.message.split('\n')[0];
  const bodyLines = commit.message.split('\n').slice(1).join('\n').trim();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm flex items-center gap-2" style={{ color: '#656d76' }}>
        <Link
          to={`/${owner}/${repo}/commits`}
          className="flex items-center gap-1 hover:underline"
          style={{ color: '#0969da' }}
        >
          <ArrowLeft size={14} /> Back to commits
        </Link>
      </div>

      {/* Commit Header */}
      <div className="mb-4 pb-4 border-b" style={{ borderColor: '#d0d7de' }}>
        <h1 className="text-2xl mb-3" style={{ color: '#1f2328', fontWeight: 600 }}>
          {titleLine}
        </h1>

        {/* Author info */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
            style={{ backgroundColor: getAvatarColor(commit.author_login || commit.author_name) }}
          >
            {getInitials(commit.author_login || commit.author_name)}
          </div>
          <div className="text-sm" style={{ color: '#656d76' }}>
            <span className="font-semibold" style={{ color: '#1f2328' }}>
              {commit.author_name}
            </span>
            {' '}committed {formatDate(commit.authored_date)}
          </div>
        </div>

        {/* SHA + parents */}
        <div className="flex items-center gap-4 text-xs" style={{ color: '#656d76' }}>
          <div className="flex items-center gap-1.5">
            <GitCommit size={12} />
            <span className="font-mono" style={{ color: '#1f2328' }}>{commit.sha}</span>
          </div>
          {commit.parent_shas.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span>parent{commit.parent_shas.length > 1 ? 's' : ''}:</span>
              {commit.parent_shas.map((sha) => (
                <Link
                  key={sha}
                  to={`/${owner}/${repo}/commit/${sha}`}
                  className="font-mono hover:underline"
                  style={{ color: '#0969da' }}
                >
                  {sha.slice(0, 7)}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: '#656d76' }}>
          <span style={{ color: '#1a7f37' }}>
            <Plus size={12} className="inline" />{commit.additions}
          </span>
          <span style={{ color: '#cf222e' }}>
            <Minus size={12} className="inline" />{commit.deletions}
          </span>
          <span>
            <FileCode size={12} className="inline mr-1" />
            {commit.changed_files} file{commit.changed_files !== 1 ? 's' : ''} changed
          </span>
        </div>
      </div>

      {/* Commit body */}
      {bodyLines && (
        <div className="mb-6 rounded-md border overflow-hidden" style={{ borderColor: '#d0d7de' }}>
          <div
            className="px-4 py-2 text-sm border-b font-semibold"
            style={{ backgroundColor: '#f6f8fa', borderColor: '#d0d7de', color: '#1f2328' }}
          >
            Commit message
          </div>
          <div className="p-4 prose prose-sm max-w-none" style={{ backgroundColor: '#ffffff', color: '#1f2328' }}>
            <Markdown>{bodyLines}</Markdown>
          </div>
        </div>
      )}

      {/* File summary */}
      {data.files.length > 0 && (
        <div className="mb-4 p-3 rounded-md border text-sm" style={{ borderColor: '#d0d7de', backgroundColor: '#f6f8fa' }}>
          <span style={{ color: '#1f2328' }}>
            Showing <strong>{data.files.length}</strong> changed file{data.files.length !== 1 ? 's' : ''} with{' '}
            <strong style={{ color: '#1a7f37' }}>{commit.additions} additions</strong> and{' '}
            <strong style={{ color: '#cf222e' }}>{commit.deletions} deletions</strong>
          </span>
        </div>
      )}

      {/* File diffs */}
      {data.files.map((file) => (
        <DiffView key={file.filename} file={file} />
      ))}

      {data.files.length === 0 && (
        <div className="text-center py-8 rounded-md border" style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff' }}>
          <FileCode size={24} style={{ color: '#656d76' }} className="mx-auto mb-2" />
          <p style={{ color: '#656d76' }}>No file changes</p>
        </div>
      )}
    </div>
  );
};

export default CommitDetail;
