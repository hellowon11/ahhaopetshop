import { useShopInfo } from '../hooks/useShopInfo';

export const Header = () => {
  const { shopInfo } = useShopInfo();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {shopInfo?.logo && (
              <img
                src={shopInfo.logo}
                alt={shopInfo.name}
                className="h-10 w-auto"
              />
            )}
            <h1 className="ml-3 text-xl font-semibold text-gray-900">
              {shopInfo?.name || 'Loading...'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {shopInfo?.socialMedia.whatsapp && (
              <a
                href={`https://wa.me/${shopInfo.socialMedia.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900"
              >
                <WhatsAppIcon className="h-6 w-6" />
              </a>
            )}
            
            {shopInfo?.socialMedia.instagram && (
              <a
                href={shopInfo.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900"
              >
                <InstagramIcon className="h-6 w-6" />
              </a>
            )}
            
            {shopInfo?.socialMedia.facebook && (
              <a
                href={shopInfo.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900"
              >
                <FacebookIcon className="h-6 w-6" />
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}; 