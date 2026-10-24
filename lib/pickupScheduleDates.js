const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

function getJakartaDate(now) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
}

export function getAllowedPickupDates(now = new Date()) {
    const today = new Date(`${getJakartaDate(now)}T00:00:00Z`);
    const weekday = today.getUTCDay();
    const nextMondayOffset = (8 - weekday) % 7 || 7;
    const startOffset = weekday >= 5 || weekday === 0 ? nextMondayOffset : 1;
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() + startOffset);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 5 - startDate.getUTCDay());

    const dates = [];
    for (
        const date = new Date(startDate);
        date <= endDate;
        date.setUTCDate(date.getUTCDate() + 1)
    ) {
        dates.push({
            date: date.toISOString().slice(0, 10),
            day: weekdays[date.getUTCDay()]
        });
    }
    return dates;
}
