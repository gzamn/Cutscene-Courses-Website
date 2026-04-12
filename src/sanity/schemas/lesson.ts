export default {
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Video', value: 'video' },
          { title: 'Quiz', value: 'quiz' },
          { title: 'Assignment', value: 'assignment' },
        ],
      },
    },
    {
      name: 'duration',
      title: 'Duration',
      type: 'string',
    },
    {
      name: 'videoUrl',
      title: 'Video URL',
      type: 'string',
      hidden: ({ document }: any) => document?.type !== 'video',
    },
    {
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [{ type: 'block' }],
    },
  ],
};
