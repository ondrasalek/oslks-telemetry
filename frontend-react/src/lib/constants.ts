export const COOKIE_CONTENT = {
    banner: {
        title: 'Cookies',
        description:
            'We use cookies to improve your experience. Read more in our ',
        linkText: 'Cookie Policy',
        buttons: {
            settings: 'Cookie Settings',
            rejectAll: 'Reject All',
            acceptAll: 'Accept All',
            save: 'Save Settings',
        },
        dialog: {
            title: 'Cookie Settings',
            description:
                'Manage your cookie preferences. Essential cookies are always enabled as they are necessary for the website to function.',
            essential: {
                title: 'Essential Cookies',
                description:
                    'Required for the website to function properly. Cannot be disabled.',
            },
            analytics: {
                title: 'Analytics Cookies',
                description:
                    'Help us understand how visitors interact with our website using OSLKS analytics.',
            },
        },
    },
} as const;
