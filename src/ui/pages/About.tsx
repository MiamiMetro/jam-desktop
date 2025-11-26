export default function About() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-bold mb-8">About</h1>
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <p className="text-lg text-gray-300 mb-4">
            This is a demo Electron app built with:
          </p>
          <ul className="space-y-2 text-gray-400">
            <li className="flex items-center gap-2">
              <span className="text-blue-400">→</span> React 19
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">→</span> Vite
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">→</span> TypeScript
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">→</span> Tailwind CSS 4
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">→</span> React Query
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">→</span> React Router
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-400">→</span> Electron
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
