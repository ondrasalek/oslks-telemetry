import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCookieStore } from '@/lib/store';
import { COOKIE_CONTENT } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function CookieBanner() {
    const {
        hasInteracted,
        acceptAll,
        rejectAll,
        consent,
        setConsent,
        saveSettings,
    } = useCookieStore((state) => state);

    const [isOpen, setIsOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    const t = COOKIE_CONTENT.banner;
    const { pathname } = useLocation();

    React.useEffect(() => {
        useCookieStore.persist.rehydrate();
        setMounted(true);
    }, []);

    if (!mounted || hasInteracted || pathname === '/cookies') {
        return null;
    }
    return (
        <div className='fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-lg md:p-6 animate-in slide-in-from-bottom-full duration-500'>
            <div className='container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row'>
                {/* TEXTOVÁ ČÁST */}
                <div className='text-center md:text-left space-y-1'>
                    <h2 className='text-lg font-semibold'>{t.title}</h2>
                    <p className='text-sm text-muted-foreground max-w-xl'>
                        {t.description}
                        <Link
                            to='/cookies'
                            className='underline hover:text-foreground transition-colors'
                        >
                            {t.linkText}
                        </Link>
                        .
                    </p>
                </div>

                {/* TLAČÍTKA */}
                <div className='flex flex-col gap-2 sm:flex-row w-full md:w-auto'>
                    {/* MODÁLNÍ OKNO */}
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant='outline'
                                className='w-full sm:w-auto'
                            >
                                {t.buttons.settings}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className='sm:max-w-[425px]'>
                            <DialogHeader>
                                <DialogTitle>{t.dialog.title}</DialogTitle>
                                <DialogDescription>
                                    {t.dialog.description}
                                </DialogDescription>
                            </DialogHeader>

                            <div className='grid gap-6 py-4'>
                                {/* 1. Nezbytné */}
                                <div className='flex items-center justify-between space-x-4'>
                                    <Label
                                        htmlFor='essential'
                                        className='flex flex-col space-y-1'
                                    >
                                        <span>{t.dialog.essential.title}</span>
                                        <span className='font-normal text-xs text-muted-foreground'>
                                            {t.dialog.essential.description}
                                        </span>
                                    </Label>
                                    <Switch
                                        id='essential'
                                        checked={true}
                                        disabled
                                    />
                                </div>

                                {/* 2. Analytické */}
                                <div className='flex items-center justify-between space-x-4'>
                                    <Label
                                        htmlFor='analytics'
                                        className='flex flex-col space-y-1'
                                    >
                                        <span>{t.dialog.analytics.title}</span>
                                        <span className='font-normal text-xs text-muted-foreground'>
                                            {t.dialog.analytics.description}
                                        </span>
                                    </Label>
                                    <Switch
                                        id='analytics'
                                        checked={consent.analytics}
                                        onCheckedChange={(checked) =>
                                            setConsent({ analytics: checked })
                                        }
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    onClick={() => {
                                        saveSettings();
                                        setIsOpen(false);
                                    }}
                                    className='w-full'
                                >
                                    {t.buttons.save}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* RYCHLÉ VOLBY */}
                    <Button
                        variant='secondary'
                        onClick={rejectAll}
                        className='w-full sm:w-auto'
                    >
                        {t.buttons.rejectAll}
                    </Button>
                    <Button onClick={acceptAll} className='w-full sm:w-auto'>
                        {t.buttons.acceptAll}
                    </Button>
                </div>
            </div>
        </div>
    );
}
