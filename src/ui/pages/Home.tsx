import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import reactLogo from "@/assets/react.svg";

interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

export default function Home() {
  const [count, setCount] = useState(0);

  const { data, isLoading, error } = useQuery<Todo>({
    queryKey: ["todo"],
    queryFn: async () => {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/todos/1"
      );
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex gap-8 mb-4">
        <a
          href="https://react.dev"
          target="_blank"
          className="transition-transform hover:drop-shadow-[0_0_2em_#61dafbaa] hover:-translate-y-1 animate-[spin_20s_linear_infinite]"
        >
          <img src={reactLogo} className="w-16 h-16" alt="React logo" />
        </a>
      </div>

      <h1 className="text-4xl font-bold mb-4">Vite + React</h1>

      <div className="bg-gray-800 rounded-lg p-8 mb-8 shadow-xl flex flex-col items-center max-w-md">
        <button
          className="px-5 py-2 bg-gray-700 text-white rounded-lg border border-transparent hover:border-blue-500 transition-colors font-medium"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
        <p className="mt-4 text-gray-400">
          Edit{" "}
          <code className="bg-gray-700 px-2 py-1 rounded text-amber-400">
            src/ui/App.tsx
          </code>{" "}
          and save to test HMR
        </p>

        <div className="mt-4 w-full border-t border-gray-700 pt-6">

          {isLoading && (
            <p className="text-blue-400 text-center">Loading todo...</p>
          )}
          {error && (
            <p className="text-red-400 text-center">Error: {error.message}</p>
          )}
          {data && (
            <div className="bg-gray-700 rounded p-4">
              <p className="text-sm text-gray-400 mb-2">Todo #{data.id}</p>
              <p className="font-medium">{data.title}</p>
              <p className="text-sm mt-2">
                Status:{" "}
                <span
                  className={
                    data.completed ? "text-green-400" : "text-yellow-400"
                  }
                >
                  {data.completed ? "✓ Completed" : "⏳ Pending"}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
