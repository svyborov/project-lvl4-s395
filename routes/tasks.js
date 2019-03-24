import buildFormObj from '../lib/formObjectBuilder';
import {
  Task, Tag, TaskStatus, User,
} from '../models';
import { checkLogin } from '../lib/utils';

const getTagsId = async (tags = '') => {
  const normalizedTags = tags.replace(/\s/g, '');
  if (normalizedTags.length === 0) {
    return null;
  }
  const tagsIds = await Promise.all(normalizedTags.split(',').map(async (name) => {
    const tag = await Tag.findCreateFind({ where: { name } });
    return tag[0].id;
  }));
  return tagsIds;
};

const scopes = {
  assignedToId: 'filterByAssignedToId',
  creatorId: 'filterByCreatorId',
  taskStatusId: 'filterByTaskStatusId',
  tagsIds: 'filterByTagsIds',
};

const createScopes = params => Object.keys(params).reduce((acc, name) => (params[name] && scopes[name] ? [...acc, { method: [scopes[name], params[name]] }] : acc), ['Assotiations']);

export default (router) => {
  router
    .get('tasks', '/tasks', checkLogin, async (ctx) => {
      const { query } = ctx.request;
      try {
        const tagsIds = await getTagsId(query.tags);
        query.tagsIds = await tagsIds;
        const localScopes = await createScopes(query);
        const statuses = await TaskStatus.findAll();
        const users = await User.findAll();
        const tags = await Tag.findAll();
        const tasks = await Task.scope(localScopes).findAll();
        ctx.render('tasks', {
          f: buildFormObj(tasks), tasks, statuses, users, tags,
        });
      } catch (e) {
        ctx.render('tasks', { f: buildFormObj(e) });
      }
    })
    .get('newTask', '/tasks/new', checkLogin, async (ctx) => {
      const task = Task.build();
      const statuses = await TaskStatus.findAll();
      const users = await User.findAll();
      ctx.render('tasks/new', { f: buildFormObj(task), statuses, users });
    })
    .post('createTask', '/tasks', checkLogin, async (ctx) => {
      const { body: { form } } = ctx.request;
      form.creatorId = ctx.session.userId;
      const task = Task.build(form);
      try {
        const { tags } = form;
        const tagsIds = getTagsId(tags);
        await task.save();
        await task.setTags(tagsIds);
        ctx.flashMessage.notice = 'Task has been created';
        ctx.redirect(router.url('tasks'));
      } catch (e) {
        ctx.render('tasks/new', { f: buildFormObj(task, e) });
      }
    })
    .get('showTask', '/tasks/:id', async (ctx) => {
      try {
        const { id } = ctx.params;
        const task = await Task.scope('Assotiations').findByPk(id);
        ctx.render('tasks/show', { f: buildFormObj(task), task });
      } catch (e) {
        ctx.render('tasks', { f: buildFormObj(e) });
      }
    })
    .get('editTask', '/tasks/:id/edit', checkLogin, async (ctx) => {
      try {
        const { id } = ctx.params;
        const task = await Task.scope('Assotiations').findByPk(id);
        const statuses = await TaskStatus.findAll();
        const users = await User.findAll();
        const { Tags } = task;
        const tagsNames = Tags.map(tag => tag.name);
        task.tagsNames = tagsNames;
        ctx.render('tasks/edit', {
          f: buildFormObj(task), task, statuses, users,
        });
      } catch (e) {
        ctx.render('tasks', { f: buildFormObj(e) });
      }
    })
    .patch('updateTask', '/tasks/:id', checkLogin, async (ctx) => {
      const { id } = ctx.params;
      const { body: { form } } = ctx.request;
      const {
        name, description, tagsNames, assignedToId, taskStatusId,
      } = form;
      const tagsIds = await getTagsId(tagsNames);
      const task = await Task.findByPk(id);
      try {
        await task.update({
          name, description, assignedToId, taskStatusId,
        });
        await task.setTags(tagsIds);
        ctx.flashMessage.notice = 'Task has been updated';
        ctx.redirect(router.url('tasks'));
      } catch (e) {
        ctx.render('tasks/new', { f: buildFormObj(task, e) });
      }
    })
    .delete('deleteTask', '/tasks/:id/delete', checkLogin, async (ctx) => {
      const { id } = ctx.params;
      const task = await Task.findByPk(id);
      await task.destroy();
      ctx.session = {};
      ctx.redirect(router.url('tasks'));
    });
};
