import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { GitCommit, AlertCircle, ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';
import { formatDate, getToken } from '../components/Layout';
import TabNavigation from '../components/TabNavigation';

const CommitList = () => {
  const { owner, repo } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const selectedBranch = searchParams.get('sha') || '';

  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [branches, setBranches] = useState([]);
  const [defaultBranch, setDefaultBranch] = useState('');

  useEffect(() => {
    fetchMeta();
  }, [owner, repo]);

  useEffect(() => {
    fetchCommits();
  }, [owner, repo, page, selectedBranch]);

  const fetchMeta = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [repoRes, branchRes] = await Promise.all([
        fetch(`/api/repos/${owner}/${repo}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/repos/${owner}/${repo}/branches`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        setDefaultBranch(repoData.default_branch);
      }
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(branchData.branches);
      }
    } catch (_) {}
  };

  const fetchCommits = async () => {
    const token = getToken();
    if (!token) {
      setError('Please set your PAT token first (click "Set Token" in the header)');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (selectedBranch) params.set('sha', selectedBranch);

      const response = await fetch(
        `/api/commits/${owner}/${repo}?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch commits');
      const data = await response.json();
      setCommits(data.commits);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (branch) => {
    const params = { page: '1' };
    if (branch) params.sha = branch;
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = { page: newPage.toString() };
    if (selectedBranch) params.sha = selectedBranch;
    setSearchParams(params);
  };

  const getFirstLine = (message) => message.split('\n')[0];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm" style={{ color: '#656d76' }}>
        <Link to="/" className="hover:underline" style={{ color: '#0969da' }}>Home</Link>
        <span className="mx-2">/</span>
        <span style={{ color: '#1f2328' }}>{owner}/{repo}</span>
      </div>

      <TabNavigation owner={owner} repo={repo} activeTab="commits" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b" style={{ borderColor: '#d0d7de' }}>
        <h1 className="text-2xl font-semibold" style={{ color: '#1f2328' }}>Commits</h1>

        {/* Branch selector */}
        {branches.length > 0 && (
          <div className="flex items-center gap-2">
            <GitBranch size={14} style={{ color: '#656d76' }} />
            <select
              value={selectedBranch || defaultBranch}
              onChange={(e) => handleBranchChange(e.target.value === defaultBranch ? '' : e.target.value)}
              className="px-2 py-1.5 text-sm rounded-md border outline-none"
              style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff', color: '#1f2328' }}
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-md border flex items-center gap-3" style={{ backgroundColor: '#ffebe9', borderColor: '#ff8182', color: '#cf222e' }}>
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p style={{ color: '#656d76' }}>Loading commits...</p>
        </div>
      )}

      {/* Commit List */}
      {!loading && !error && (
        <div className="rounded-md border overflow-hidden" style={{ borderColor: '#d0d7de' }}>
          {commits.length === 0 ? (
            <div className="text-center py-12" style={{ backgroundColor: '#ffffff' }}>
              <GitCommit size={32} style={{ color: '#656d76' }} className="mx-auto mb-2" />
              <p style={{ color: '#656d76' }}>No commits found</p>
            </div>
          ) : (
            commits.map((commit) => (
              <Link
                key={commit.sha}
                to={`/${owner}/${repo}/commit/${commit.sha}`}
                className="block px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff' }}
              >
                <div className="flex items-start gap-3">
                  <GitCommit size={18} style={{ color: '#656d76', marginTop: '2px', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: '#1f2328' }}>
                      {getFirstLine(commit.message)}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: '#656d76' }}>
                      {commit.author_name} · {formatDate(commit.authored_date)}
                    </div>
                  </div>
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded flex-shrink-0"
                    style={{ backgroundColor: '#ddf4ff', color: '#0969da' }}
                  >
                    {commit.short_sha}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && commits.length > 0 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-md border transition-colors disabled:opacity-50"
            style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff', color: '#1f2328' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 py-1.5 text-sm" style={{ color: '#656d76' }}>
            Page {page}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasMore}
            className="px-3 py-1.5 text-sm rounded-md border transition-colors disabled:opacity-50"
            style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff', color: '#1f2328' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CommitList;
