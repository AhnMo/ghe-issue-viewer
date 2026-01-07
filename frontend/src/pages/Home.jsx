import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleDot, GitPullRequest, Building2, FolderGit2 } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [owner, setOwner] = useState(() => sessionStorage.getItem('ghe_owner') || '');
  const [repo, setRepo] = useState(() => sessionStorage.getItem('ghe_repo') || '');

  // Save to sessionStorage when values change
  useEffect(() => {
    if (owner) sessionStorage.setItem('ghe_owner', owner);
  }, [owner]);

  useEffect(() => {
    if (repo) sessionStorage.setItem('ghe_repo', repo);
  }, [repo]);

  const goToIssues = () => {
    if (owner && repo) {
      navigate(`/${owner}/${repo}/issues`);
    }
  };

  const goToPRs = () => {
    if (owner && repo) {
      navigate(`/${owner}/${repo}/pulls`);
    }
  };

  return (
    <div className="text-center py-20">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ backgroundColor: '#ddf4ff' }}>
        <svg height="40" viewBox="0 0 16 16" width="40" fill="#0969da">
          <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
        </svg>
      </div>
      <h1 className="text-3xl font-semibold mb-2" style={{ color: '#1f2328' }}>GHE Issue Viewer</h1>
      <p className="mb-8" style={{ color: '#656d76' }}>Browse issues and pull requests from any repository</p>
      
      <div className="max-w-lg mx-auto">
        <div className="flex gap-2 mb-6">
          <div className="flex-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-left" style={{ color: '#1f2328' }}>
              <Building2 size={12} /> Owner
            </label>
            <input
              type="text"
              placeholder="organization"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border outline-none"
              style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff' }}
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-left" style={{ color: '#1f2328' }}>
              <FolderGit2 size={12} /> Repository
            </label>
            <input
              type="text"
              placeholder="repository"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border outline-none"
              style={{ borderColor: '#d0d7de', backgroundColor: '#ffffff' }}
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={goToIssues}
            disabled={!owner || !repo}
            className="flex-1 px-4 py-3 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#1f883d', color: '#ffffff' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1a7f37'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#1f883d'}
          >
            <CircleDot size={18} /> Browse Issues
          </button>
          <button
            onClick={goToPRs}
            disabled={!owner || !repo}
            className="flex-1 px-4 py-3 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#8250df', color: '#ffffff' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#6639ba'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#8250df'}
          >
            <GitPullRequest size={18} /> Browse PRs
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
