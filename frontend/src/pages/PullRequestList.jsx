import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { GitPullRequest, GitMerge, CircleDot, AlertCircle, ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';
import { formatDate, getToken } from '../components/Layout';

// Parse q param: "is:open" -> "open"
const parseQueryFilter = (q) => {
  if (!q) return 'open';
  const match = q.match(/is:(\w+)/);
  return match ? match[1] : 'open';
};

// Build q param: "open" -> "is:open"
const buildQueryFilter = (filter) => `is:${filter}`;

const PullRequestList = () => {
  const { owner, repo } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read from URL params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const filter = parseQueryFilter(searchParams.get('q'));
  
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Update URL params
  const updateParams = (newPage, newFilter) => {
    setSearchParams({
      page: newPage.toString(),
      q: buildQueryFilter(newFilter)
    });
  };

  const handleFilterChange = (newFilter) => {
    updateParams(1, newFilter); // Reset to page 1 when filter changes
  };

  const handlePageChange = (newPage) => {
    updateParams(newPage, filter);
  };

  useEffect(() => {
    fetchPRs();
  }, [owner, repo, page, filter]);

  const fetchPRs = async () => {
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
        `/api/pulls/${owner}/${repo}?page=${page}&state=${filter}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch pull requests');
      const data = await response.json();
      setPrs(data.pull_requests);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPRIcon = (pr) => {
    if (pr.merged_at) {
      return <GitMerge size={18} style={{ color: '#8250df', marginTop: '2px' }} />;
    }
    if (pr.state === 'open') {
      return <GitPullRequest size={18} style={{ color: '#1f883d', marginTop: '2px' }} />;
    }
    return <GitPullRequest size={18} style={{ color: '#cf222e', marginTop: '2px' }} />;
  };

  const getPRStatus = (pr) => {
    if (pr.merged_at) return 'Merged';
    if (pr.state === 'open') return 'Open';
    return 'Closed';
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm" style={{ color: '#656d76' }}>
        <Link to="/" className="hover:underline" style={{ color: '#0969da' }}>Home</Link>
        <span className="mx-2">/</span>
        <span style={{ color: '#1f2328' }}>{owner}/{repo}</span>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-4 border-b" style={{ borderColor: '#d0d7de' }}>
        <Link 
          to={`/${owner}/${repo}/issues?page=1&q=is:open`}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
          style={{ color: '#656d76' }}
        >
          <CircleDot size={16} /> Issues
        </Link>
        <Link 
          to={`/${owner}/${repo}/pulls?page=1&q=is:open`}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors relative"
          style={{ color: '#1f2328', borderBottom: '2px solid #fd8c73', marginBottom: '-1px' }}
        >
          <GitPullRequest size={16} /> Pull Requests
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b" style={{ borderColor: '#d0d7de' }}>
        <h1 className="text-2xl font-semibold" style={{ color: '#1f2328' }}>
          Pull Requests
        </h1>
        
        {/* Filter Tabs */}
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: '#d0d7de' }}>
          {['open', 'closed', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className="px-3 py-1.5 text-sm font-medium capitalize transition-colors"
              style={{
                backgroundColor: filter === f ? '#8250df' : '#ffffff',
                color: filter === f ? '#ffffff' : '#1f2328',
              }}
            >
              {f}
            </button>
          ))}
        </div>
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
          <p style={{ color: '#656d76' }}>Loading pull requests...</p>
        </div>
      )}

      {/* PR List */}
      {!loading && !error && (
        <div className="rounded-md border overflow-hidden" style={{ borderColor: '#d0d7de' }}>
          {prs.length === 0 ? (
            <div className="text-center py-12" style={{ backgroundColor: '#ffffff' }}>
              <GitPullRequest size={32} style={{ color: '#656d76' }} className="mx-auto mb-2" />
              <p style={{ color: '#656d76' }}>No {filter !== 'all' ? filter : ''} pull requests found</p>
            </div>
          ) : (
            prs.map((pr) => (
              <Link
                key={pr.number}
                to={`/${owner}/${repo}/pull/${pr.number}`}
                className="block px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff' }}
              >
                <div className="flex items-start gap-3">
                  {getPRIcon(pr)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold hover:text-blue-600" style={{ color: '#1f2328' }}>
                        {pr.title}
                      </span>
                    </div>
                    <div className="mt-1 text-xs flex items-center gap-3" style={{ color: '#656d76' }}>
                      <span>#{pr.number} opened {formatDate(pr.created_at)} by {pr.user_login}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#f6f8fa' }}>
                        <GitBranch size={10} />
                        {pr.head_ref} → {pr.base_ref}
                      </span>
                    </div>
                  </div>
                  
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: pr.merged_at ? '#8250df' : pr.state === 'open' ? '#dafbe1' : '#ffebe9',
                      color: pr.merged_at ? '#ffffff' : pr.state === 'open' ? '#1a7f37' : '#cf222e'
                    }}
                  >
                    {getPRStatus(pr)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && prs.length > 0 && (
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

export default PullRequestList;
