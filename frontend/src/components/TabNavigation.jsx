import React from 'react';
import { Link } from 'react-router-dom';
import { CircleDot, GitPullRequest, Code, GitCommit } from 'lucide-react';

const TabNavigation = ({ owner, repo, activeTab }) => {
  const tabs = [
    { id: 'issues', label: 'Issues', icon: <CircleDot size={16} />, href: `/${owner}/${repo}/issues?page=1&q=is:open` },
    { id: 'pulls', label: 'Pull Requests', icon: <GitPullRequest size={16} />, href: `/${owner}/${repo}/pulls?page=1&q=is:open` },
    { id: 'code', label: 'Code', icon: <Code size={16} />, href: `/${owner}/${repo}/code` },
    { id: 'commits', label: 'Commits', icon: <GitCommit size={16} />, href: `/${owner}/${repo}/commits` },
  ];

  return (
    <div className="flex gap-4 mb-4 border-b" style={{ borderColor: '#d0d7de' }}>
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.href}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === tab.id ? '#1f2328' : '#656d76',
            borderBottom: activeTab === tab.id ? '2px solid #fd8c73' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          {tab.icon} {tab.label}
        </Link>
      ))}
    </div>
  );
};

export default TabNavigation;
