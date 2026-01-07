import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import IssueList from './pages/IssueList';
import IssueDetail from './pages/IssueDetail';
import PullRequestList from './pages/PullRequestList';
import PullRequestDetail from './pages/PullRequestDetail';

const App = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:owner/:repo/issues" element={<IssueList />} />
          <Route path="/:owner/:repo/issues/:issueNumber" element={<IssueDetail />} />
          <Route path="/:owner/:repo/pulls" element={<PullRequestList />} />
          <Route path="/:owner/:repo/pull/:prNumber" element={<PullRequestDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
