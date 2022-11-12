import Vue from "vue";
import VueRouter from "vue-router";

const homeView = () => import("../views/HomeView.vue");

Vue.use(VueRouter);
const router = new VueRouter({
    mode: "history",
    routes: [
        {
            path: "/",
            component: homeView,
            name: "home",
        },
    ],
});

export default router;
