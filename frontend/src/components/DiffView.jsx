import React, { useState } from 'react';
import { FileCode, ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';

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

export default DiffView;
