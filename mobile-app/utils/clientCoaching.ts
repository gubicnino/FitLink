import { CheckIn } from '../types/checkin';
import { Coaching } from '../types/coaching';

export const CHECK_IN_INTERVAL_DAYS = 7;

export const getLatestCheckIn = (checkIns: Coaching['checkIns']) => {
  if (checkIns.length === 0) {
    return null;
  }

  return [...checkIns].reduce((latest, current) => {
    const latestStart = new Date(latest.start).getTime();
    const currentStart = new Date(current.start).getTime();

    if (Number.isNaN(currentStart)) {
      return latest;
    }

    if (Number.isNaN(latestStart) || currentStart > latestStart) {
      return current;
    }

    return latest;
  });
};

export const getEarliestCheckIn = (checkIns: Coaching['checkIns']) => {
  if (checkIns.length === 0) {
    return null;
  }

  return [...checkIns].reduce((earliest, current) => {
    const earliestStart = new Date(earliest.start).getTime();
    const currentStart = new Date(current.start).getTime();

    if (Number.isNaN(currentStart)) {
      return earliest;
    }

    if (Number.isNaN(earliestStart) || currentStart < earliestStart) {
      return current;
    }

    return earliest;
  });
};

export const sortCheckInsNewestFirst = (checkIns: CheckIn[]) =>
  [...checkIns].sort((left, right) => new Date(right.start).getTime() - new Date(left.start).getTime());

export const getDaysSince = (start?: string | null) => {
  if (!start) {
    return null;
  }

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
};

export const formatRelativeDays = (start?: string | null) => {
  const days = getDaysSince(start);

  if (days == null) {
    return 'Unknown';
  }

  if (days <= 0) {
    return 'Today';
  }

  if (days === 1) {
    return '1 day ago';
  }

  return `${days} days ago`;
};

export const formatDateLabel = (value?: string | null) => {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatWeekRange = (start?: string | null) => {
  if (!start) {
    return 'Unknown week';
  }

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return 'Unknown week';
  }

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + CHECK_IN_INTERVAL_DAYS - 1);

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

export const getWeightChange = (checkIns: Coaching['checkIns']) => {
  const first = getEarliestCheckIn(checkIns);
  const latest = getLatestCheckIn(checkIns);

  if (first?.weightKg == null || latest?.weightKg == null || first === latest) {
    return null;
  }

  return latest.weightKg - first.weightKg;
};

export const getAverageEnergy = (checkIns: Coaching['checkIns']) => {
  if (checkIns.length === 0) {
    return null;
  }

  const total = checkIns.reduce((sum, checkIn) => sum + checkIn.overallEnergyLevel, 0);
  return total / checkIns.length;
};