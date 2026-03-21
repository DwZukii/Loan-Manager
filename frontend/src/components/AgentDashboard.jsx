import { useState } from 'react'

export default function AgentDashboard({ onLogout }) {
  // Our starting dummy data
  const initialLeads = [
    { id: 1, phone: "012-345-6789", status: "Pending", notes: "" },
    { id: 2, phone: "019-876-5432", status: "Pending", notes: "" },
    { id: 3, phone: "011-222-3333", status: "Pending", notes: "" },
    { id: 4, phone: "017-555-9999", status: "Pending", notes: "" },
  ]

  const [leads, setLeads] = useState(initialLeads)
  // This memory holds the specific lead we are looking at. Null means we are on the main list.
  const [selectedLead, setSelectedLead] = useState(null)

  // Helper function to handle the dropdown changes
  const handleStatusChange = (id, newStatus) => {
    const updatedLeads = leads.map(lead => {
      if (lead.id === id) {
        return { ...lead, status: newStatus }
      }
      return lead
    })
    setLeads(updatedLeads)
  }

  // Helper function to strip dashes so the phone dialer and WhatsApp understand the number
  const cleanNumber = (phone) => {
    return phone.replace(/-/g, '')
  }

  // ==========================================
  // VIEW 2: THE DETAILS PAGE
  // ==========================================
  if (selectedLead) {
    // We find the most up-to-date version of this lead from our main list
    const currentLead = leads.find(l => l.id === selectedLead.id)

    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          
          <button 
            onClick={() => setSelectedLead(null)}
            className="mb-6 text-blue-600 font-medium hover:underline flex items-center gap-2"
          >
            ← Back to List
          </button>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentLead.phone}</h2>
            <p className="text-sm text-gray-500 mb-6">Current Status: <span className="font-semibold">{currentLead.status}</span></p>

            <div className="flex gap-3 mb-8">
              <a 
                href={`https://wa.me/6${cleanNumber(currentLead.phone)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-green-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-green-600"
              >
                Open WhatsApp
              </a>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">Agent Notes</label>
              <textarea 
                className="w-full border border-gray-300 rounded-lg p-3 h-32 focus:outline-none focus:border-blue-500"
                placeholder="Type your remarks here..."
                defaultValue={currentLead.notes}
              ></textarea>
              <button className="mt-2 bg-blue-100 text-blue-700 px-4 py-2 rounded font-medium hover:bg-blue-200">
                Save Note
              </button>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <label className="block text-gray-700 font-bold mb-2">Upload Documents</label>
              <input type="file" className="w-full text-gray-600" />
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 1: THE MAIN LIST (MOBILE FRIENDLY)
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Leads</h1>
          <button 
            onClick={onLogout}
            className="bg-red-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-600 transition"
          >
            Sign Out
          </button>
        </div>

        {/* Mobile Friendly Card List */}
        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">{lead.phone}</h3>
                
                {/* The Dropdown */}
                <select 
                  value={lead.status}
                  onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                >
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Thinking">Thinking</option>
                </select>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <a 
                  href={`tel:${cleanNumber(lead.phone)}`}
                  className="flex-1 sm:flex-none bg-blue-600 text-white text-center px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  Call
                </a>
                <button 
                  onClick={() => setSelectedLead(lead)}
                  className="flex-1 sm:flex-none bg-gray-200 text-gray-800 text-center px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
                >
                  Details
                </button>
              </div>

            </div>
          ))}
        </div>
        
      </div>
    </div>
  )
}