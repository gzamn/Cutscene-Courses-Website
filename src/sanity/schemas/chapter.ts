export default {
  name: 'chapter',
  title: 'Chapter',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'lessons',
      title: 'Lessons',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'lesson' }] }],
    },
  ],
};
