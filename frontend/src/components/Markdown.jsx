import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Custom component to filter out HTML comments
const filterComments = (content) => {
  if (!content) return '';
  // Remove HTML comments <!-- -->
  return content.replace(/<!--[\s\S]*?-->/g, '');
};

// Custom checkbox component
const TaskListItem = ({ checked, children }) => {
  return (
    <li className="task-list-item" style={{ listStyle: 'none', marginLeft: '-1.5em' }}>
      <input 
        type="checkbox" 
        checked={checked} 
        readOnly 
        style={{ 
          marginRight: '0.5em',
          width: '1em',
          height: '1em',
          accentColor: '#1f883d'
        }} 
      />
      {children}
    </li>
  );
};

// Custom details/summary styling
const Details = ({ children, ...props }) => (
  <details 
    style={{ 
      marginBottom: '16px',
      border: '1px solid #d0d7de',
      borderRadius: '6px',
      padding: '0'
    }} 
    {...props}
  >
    {children}
  </details>
);

const Summary = ({ children, ...props }) => (
  <summary 
    style={{ 
      padding: '8px 12px',
      cursor: 'pointer',
      backgroundColor: '#f6f8fa',
      borderRadius: '6px 6px 0 0',
      fontWeight: 600,
      fontSize: '14px',
      color: '#1f2328'
    }} 
    {...props}
  >
    {children}
  </summary>
);

const Markdown = ({ children, className = "prose prose-sm max-w-none" }) => {
  const filteredContent = filterComments(children);
  
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Task list items
          li: ({ node, checked, children, ...props }) => {
            if (checked !== null && checked !== undefined) {
              return <TaskListItem checked={checked}>{children}</TaskListItem>;
            }
            return <li {...props}>{children}</li>;
          },
          // Details tag
          details: Details,
          // Summary tag
          summary: Summary,
          // Style the content inside details
          div: ({ node, children, ...props }) => {
            // Check if parent is details
            if (node?.parent?.tagName === 'details') {
              return (
                <div style={{ padding: '12px', borderTop: '1px solid #d0d7de' }} {...props}>
                  {children}
                </div>
              );
            }
            return <div {...props}>{children}</div>;
          }
        }}
      >
        {filteredContent}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;

