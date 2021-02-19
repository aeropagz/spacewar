import Vue from "vue";
import VueRouter from "vue-router";
import Landing from "../views/Landing.vue";
import Lost from "../views/Lost.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Landing",
    component: Landing,
  },
  {
    path: "/arena",
    name: "Arena",
    component: () => import("../views/Arena.vue"),
  },
  {
    path: "/lost",
    name: "Lost",
    component: Lost,
  },
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

export default router;
