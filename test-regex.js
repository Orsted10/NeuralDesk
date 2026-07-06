const s = `{
  "title": "Meeting with John",
  "date": "2026-07-06",
  "startTime": "09:45",
  "endTime": "10:00"
}`;
console.log(s.match(/"?title"?\s*:\s*"?([^",\n]+)"?/i)?.[1].trim());

const s2 = `title: Meeting with John
date: 2026-07-06
startTime: 09:45
endTime: 10:00`;
console.log(s2.match(/"?title"?\s*:\s*"?([^",\n]+)"?/i)?.[1].trim());
