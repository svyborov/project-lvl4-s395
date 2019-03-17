import buildFormObj from '../lib/formObjectBuilder';
import { User } from '../models';

const checkLogin = async (ctx, next) => {
  if (ctx.session.userId) {
    ctx.redirect('/');
    return;
  }
  await next();
};

const checkRights = async (ctx, next) => {
  if (parseInt(ctx.params.id, 10) !== ctx.session.userId) {
    ctx.flashMessage.notice = 'You don\'t have permission to perform this action';
    ctx.redirect('/');
    return;
  }
  await next();
};

export default (router) => {
  router
    .get('users', '/users', async (ctx) => {
      const users = await User.findAll();
      ctx.render('users', { users });
    })
    .get('newUser', '/signup', checkLogin, (ctx) => {
      const user = User.build();
      ctx.render('users/new', { f: buildFormObj(user) });
    })
    .get('editUser', '/users/:id/edit', checkRights, async (ctx) => {
      const { id } = ctx.params;
      const user = await User.findOne({
        where: {
          id,
        },
      });
      ctx.render('users/edit', { f: buildFormObj(user), user });
    })
    .get('deleteUser', '/users/:id/delete', checkRights, async (ctx) => {
      const { id } = ctx.params;
      const user = await User.findOne({
        where: {
          id,
        },
      });
      await user.destroy();
      ctx.flashMessage.notice = 'User has been deleted';
      ctx.redirect(router.url('root'));
    })

    .get('userProfile', '/profile/:id', async (ctx) => {
      const { id } = ctx.params;
      const user = await User.findOne({
        where: {
          id,
        },
      });
      ctx.render('users/show', { user });
    })
    .patch('editUser', '/users/:id/edit', checkRights, async (ctx) => {
      const { id } = ctx.params;
      const { body: { form } } = ctx.request;
      const {
        firstName,
        lastName,
        email,
        password,
      } = form;
      const user = await User.findOne({
        where: {
          id,
        },
      });
      try {
        await user.update({
          firstName,
          lastName,
          email,
          password,
        });
        ctx.flashMessage.notice = 'User has been updated';
        ctx.redirect(router.url('root'));
      } catch (e) {
        ctx.render('users/new', { f: buildFormObj(user, e) });
      }
    })
    .post('users', '/users', async (ctx) => {
      const { body: { form } } = ctx.request;
      const { firstName, lastName, email } = form;
      const userWhithEmail = await User.findOne({
        where: {
          email,
        },
      });

      if (userWhithEmail) {
        ctx.flashMessage.notice = 'email address already exists';
        ctx.render('users/new', { f: buildFormObj({ firstName, lastName }) });
        return;
      }

      const user = User.build(form);
      try {
        await user.save();
        ctx.flashMessage.notice = 'User has been created';
        ctx.redirect(router.url('root'));
      } catch (e) {
        ctx.render('users/new', { f: buildFormObj(user, e) });
      }
    });
};
