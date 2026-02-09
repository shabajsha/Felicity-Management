const buildEventMessage = (event, baseUrl) => {
  const eventUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/event/${event._id}` : '';
  const fee = event.registrationFee ? `₹${event.registrationFee}` : 'Free';
  const deadline = event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleDateString('en-US') : 'TBD';
  const start = event.date ? new Date(event.date).toLocaleDateString('en-US') : 'TBD';
  const end = event.endDate ? new Date(event.endDate).toLocaleDateString('en-US') : start;

  const lines = [
    `**${event.title}**`,
    event.description ? event.description.slice(0, 180) : null,
    `Type: ${event.type || 'Event'}`,
    `Eligibility: ${event.eligibility || 'All'}`,
    `Fee: ${fee}`,
    `Dates: ${start} - ${end}`,
    `Registration Deadline: ${deadline}`,
    event.venue ? `Venue: ${event.venue}` : (event.location ? `Location: ${event.location}` : null),
    eventUrl ? `More: ${eventUrl}` : null
  ].filter(Boolean);

  return lines.join('\n');
};

const postEventToDiscord = async (event) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  const content = buildEventMessage(event, process.env.FRONTEND_URL);

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  } catch (error) {
    // Swallow errors to avoid breaking event approval flow.
  }
};

module.exports = {
  postEventToDiscord
};
