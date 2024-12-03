import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: ' en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
];

export const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
      i18n.changeLanguage(savedLanguage);
    }

    const savedEmailNotifications = localStorage.getItem('emailNotifications');
    if (savedEmailNotifications !== null) {
      setEmailNotifications(JSON.parse(savedEmailNotifications));
    }
  }, []);

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };

  const handleSaveChanges = () => {
    localStorage.setItem('emailNotifications', JSON.stringify(emailNotifications));
    setMessage('Changes saved successfully.');
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  const handleCancel = () => {
    setEmailNotifications(JSON.parse(localStorage.getItem('emailNotifications') || 'true'));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 pt-8 sm:grid-cols-6">
          <div className="col-span-full">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Language
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Choose your preferred language.
            </p>
            <div className="mt-6 space-y-6">
              {LANGUAGES.map(({ code, name }) => (
                <div key={code} className="relative flex gap-x-3">
                  <div className="flex h-6 items-center">
                    <input
                      id={`language-${code}`}
                      name="language"
                      type="radio"
                      value={code}
                      checked={language === code}
                      onChange={() => handleLanguageChange(code)}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                  </div>
                  <div className="text-sm leading-6">
                    <label htmlFor={`language-${code}`} className="font-medium text-gray-900">
                      {name}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-full">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Notifications
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Configure how you want to receive notifications.
            </p>
            <div className="mt-6 space-y-6">
              <div className="relative flex gap-x-3">
                <div className="flex h-6 items-center">
                  <input
                    id="email-notifications"
                    name="email-notifications"
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-30 0 text-blue-600 focus:ring-blue-600"
                  />
                </div>
                <div className="text-sm leading-6">
                  <label htmlFor="email-notifications" className="font-medium text-gray-900">
                    Email notifications
                  </label>
                  <p className="text-gray-500">
                    Receive email notifications when important events occur.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Save changes
          </button>
        </div>
      </div>
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline">{message}</span>
        </div>
      )}
    </div>
  );
};