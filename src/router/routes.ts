import { type RouteRecordRaw, type RouteLocationNormalized } from 'vue-router';
import { isValidCategory } from '@/types';
import Home from '@/views/Home.vue';

const AboutComponent = () => import('../views/About.vue');
const CreativesComponent = () => import('../views/Creatives.vue');
const CreativeDetailComponent = () => import('../views/CreativeDetail.vue');
const ContactComponent = () => import('../views/Contact.vue');
const UnderConstractionComponent = () => import('../views/UnderConstraction.vue');
const NotFoundComponent = () => import('../views/404.vue');

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutComponent,
  },
  {
    path: '/creatives',
    name: 'creatives',
    component: CreativesComponent,
    meta: {
      style: {
        top: '0',
      },
    },
  },
  {
    path: '/creatives/:category/:id',
    name: 'creative-detail',
    component: CreativeDetailComponent,
    props: true,
    beforeEnter: (to: RouteLocationNormalized) => {
      const { category } = to.params;
      if (typeof category === 'string' && isValidCategory(category)) {
        return true;
      }
      return '/404';
    },
  },
  {
    path: '/contact',
    name: 'contact',
    component: ContactComponent,
  },
  {
    path: '/underconstraction',
    name: 'underconstraction',
    component: UnderConstractionComponent,
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: NotFoundComponent,
  },
];
