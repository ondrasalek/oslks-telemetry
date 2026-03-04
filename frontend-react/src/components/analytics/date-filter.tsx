import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Clock } from 'lucide-react';

export interface DateFilterProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}

export function DateFilter({
    value,
    onValueChange,
    className,
}: DateFilterProps) {
    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className={`w-[180px] h-9 ${className || ''}`}>
                <div className='flex items-center gap-2'>
                    <Clock className='h-4 w-4 text-muted-foreground' />
                    <SelectValue placeholder='Select timeframe' />
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value='24h'>Last 24 hours</SelectItem>
                <SelectItem value='7d'>Last 7 days</SelectItem>
                <SelectItem value='30d'>Last 30 days</SelectItem>
                <SelectItem value='12m'>Last 12 months</SelectItem>
                <SelectItem value='all'>All time</SelectItem>
            </SelectContent>
        </Select>
    );
}
