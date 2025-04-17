  <div className="flex flex-col min-h-screen">
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-blue-600" />
            <span className="ml-2 text-xl font-semibold text-blue-600">Admin Portal</span>
          </div>
          <div className="flex items-center">
            <LogOut className="h-5 w-5 text-gray-500" />
          </div>
        </div>
      </div>
    </nav>

    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('members')}
                className={`pl-1 py-4 pr-4 ${
                  activeTab === 'members'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Members & Appointments
                </div>
              </button>
              <button
                onClick={() => setActiveTab('pets')}
                className={`ml-8 py-4 pr-4 ${
                  activeTab === 'pets'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Dog className="h-5 w-5 mr-2" />
                  Pet Listings
                </div>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div> 