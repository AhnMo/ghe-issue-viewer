import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Folder, FileText, AlertCircle, GitBranch, ChevronRight, ArrowLeft } from 'lucide-react';
import { getToken } from '../components/Layout';
import TabNavigation from '../components/TabNavigation';
import FileViewer from '../components/FileViewer';

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CodeBrowser = () => {
  const { owner, repo, '*': splatPath } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPath = splatPath || '';
  const ref = searchParams.get('ref') || '';

  const [contents, setContents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [defaultBranch, setDefaultBranch] = useState('');

  useEffect(() => {
    fetchMeta();
  }, [owner, repo]);

  useEffect(() => {
    fetchContents();
  }, [owner, repo, currentPath, ref]);

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

  const fetchContents = async () => {
    const token = getToken();
    if (!token) {
      setError('Please set your PAT token first (click "Set Token" in the header)');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ path: currentPath });
      if (ref) params.set('ref', ref);

      const response = await fetch(
        `/api/repos/${owner}/${repo}/contents?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch contents');
      const data = await response.json();
      setContents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (branch) => {
    const params = {};
    if (branch && branch !== defaultBranch) params.ref = branch;
    setSearchParams(params);
  };

  const buildEntryHref = (entryPath) => {
    const base = `/${owner}/${repo}/code/${entryPath}`;
    return ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
  };

  // Build breadcrumb segments from current path
  const breadcrumbs = currentPath
    ? currentPath.split('/').map((segment, idx, arr) => ({
        name: segment,
        path: arr.slice(0, idx + 1).join('/'),
      }))
    : [];

  const parentPath = breadcrumbs.length > 1
    ? breadcrumbs[breadcrumbs.length - 2].path
    : null;

  const activeRef = ref || defaultBranch;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 text-sm" style={{ color: '#656d76' }}>
        <Link to="/" className="hover:underline" style={{ color: '#0969da' }}>Home</Link>
        <span className="mx-2">/</span>
        <span style={{ color: '#1f2328' }}>{owner}/{repo}</span>
      </div>

      <TabNavigation owner={owner} repo={repo} activeTab="code" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b" style={{ borderColor: '#d0d7de' }}>
        {/* Path breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <Link
            to={buildEntryHref('')}
            className="font-semibold hover:underline"
            style={{ color: '#0969da' }}
          >
            {repo}
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              <ChevronRight size={14} style={{ color: '#656d76' }} />
              {idx === breadcrumbs.length - 1 ? (
                <span style={{ color: '#1f2328', fontWeight: 600 }}>{crumb.name}</span>
              ) : (
                <Link
                  to={buildEntryHref(crumb.path)}
                  className="hover:underline"
                  style={{ color: '#0969da' }}
                >
                  {crumb.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Branch selector */}
        {branches.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <GitBranch size={14} style={{ color: '#656d76' }} />
            <select
              value={activeRef}
              onChange={(e) => handleBranchChange(e.target.value)}
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
          <p style={{ color: '#656d76' }}>Loading...</p>
        </div>
      )}

      {/* Directory view */}
      {!loading && !error && contents?.type === 'dir' && (
        <div className="rounded-md border overflow-hidden" style={{ borderColor: '#d0d7de' }}>
          {/* Parent dir link */}
          {currentPath && (
            <Link
              to={parentPath ? buildEntryHref(parentPath) : `/${owner}/${repo}/code${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`}
              className="flex items-center gap-2 px-4 py-2.5 border-b hover:bg-gray-50 transition-colors text-sm"
              style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff', color: '#656d76' }}
            >
              <ArrowLeft size={14} />
              ..
            </Link>
          )}

          {contents.tree.entries.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#656d76' }}>Empty directory</div>
          ) : (
            contents.tree.entries.map((entry) => (
              <Link
                key={entry.path}
                to={buildEntryHref(entry.path)}
                className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff' }}
              >
                {entry.type === 'dir' ? (
                  <Folder size={16} style={{ color: '#54aeff', flexShrink: 0 }} />
                ) : (
                  <FileText size={16} style={{ color: '#656d76', flexShrink: 0 }} />
                )}
                <span className="flex-1 text-sm" style={{ color: '#1f2328' }}>
                  {entry.name}
                </span>
                {entry.type === 'file' && entry.size != null && (
                  <span className="text-xs" style={{ color: '#656d76' }}>
                    {formatSize(entry.size)}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      )}

      {/* File view */}
      {!loading && !error && contents?.type === 'file' && (
        <FileViewer file={contents.file} />
      )}
    </div>
  );
};

export default CodeBrowser;
