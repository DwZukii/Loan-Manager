export default function Login({ onLogin }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Loan Manager CRM
        </h2>
        
        <form>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Agent Email
            </label>
            <input 
              type="email" 
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500" 
              placeholder="agent@company.com" 
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input 
              type="password" 
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500" 
              placeholder="••••••••" 
            />
          </div>
          
          <button 
            type="button"
            onClick={onLogin}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700 transition duration-200"
          >
            Sign In
          </button>
        </form>

      </div>
    </div>
  )
}