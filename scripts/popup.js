Vue.component("MockItem", {
  template: `
      <li style="list-style:none;">
        <sui-segment>
          <div style="display:flex;justify-content:space-between;">
            <p>NAME: {{ info.name }}</p>
            <sui-dropdown selection placeholder="State" v-model="current" :options="options" fluid>
            </sui-dropdown>
          </div>
          <p>URL: {{ info.url }}</p>
        </sui-segment>
      </li>
    `,
  name: "MockItem",
  data() {
    return {
      current: false,
      options: [
        {
          key: '__random',
          text: 'Random Cases',
          value: '__random',
        },
        {
          key: '__disabled',
          text: 'Disable',
          value: 0,
        }
      ]
    }
  },
  watch: {
    current: function () {
      if (this.current !== this.info.enable) {
        this.UpdateDocFromDB(this.info._id);
      }
    }
  },
  props: ["info"],
  methods: {
    UpdateDocFromDB: async function (_id) {
      const db = new PouchDB('MOKER_POUCHDB');
      let oldData = await db.get(_id).catch(e => { throw e })
      if (!oldData) return false;
      const doc = {
        ...oldData,
        enable: this.current
      }
      let result = await db.put(doc).catch(e => { throw e })
      window.localStorage.setItem("MOKER_ID:" + _id, JSON.stringify(doc));
      return result;
    }
  },
  mounted() {
    this.info.cases.split(',').forEach(k => {
      this.options.push({
        key: k,
        text: k,
        value: k
      })
    })
    this.current = this.info.enable || 0
  }
})
Vue.component("StatusBar", {
  template: `
        <div style="display: flex; align-items: center; justify-content: space-between">
          <sui-button-group>
            <sui-button title="Stop listening" negative icon="pause circle" v-if="mockFlag" @click="toggleMockHandler(!mockFlag)" />
            <sui-button title="Start listening" positive icon="right play" v-else @click="toggleMockHandler(!mockFlag)" />
            <sui-button title="Clear All History" icon="trash alternate" @click="clearHistory" />
          </sui-button-group>
          <sui-button content="Edit or Create" icon="external alternate right" label-position="right" @click="window.open(adminPanel)" />
        </div>
    `,
  name: "StatusBar",
  data() {
    return {
      mockFlag: false,
      adminPanel: ""
    }
  },
  mounted() {
    const config = loadConfig();
    if (config.enable) this.mockFlag = true;
    if (config.server) this.adminPanel = config.server + '/admin'
  },
  methods: {
    toggleMockHandler(status) {
      this.mockFlag = status;
      updateConfig({ enable: this.mockFlag });
    },
    clearHistory() { }
  }
})
const App = {
  template: `<div>
    <status-bar />
    <sui-input
      placeholder="Search collections ..."
      icon="search"
      style="margin-top:10px;"
      @change="changeHandler"
    />
    <sui-divider horizontal>Captured Requests</sui-divider>
    <ul style="padding: 0">
      <mock-item v-for="item in records" :info="item" :key="item.id"></mock-item>
    </ul>
  </div>`,
  name: "App",
  data() {
    return {
      records: null
    };
  },
  methods: {
    async loadRecords(collection) {
      const db = new PouchDB("MOKER_POUCHDB");
      let selector = {}
      if (collection) {
        selector.capture_time = { $gt: null }
        selector.collections = { $elemMatch: collection }
      }
      await db.createIndex({
        index: { fields: ["capture_time", 'collections'] },
        name: "collection_list"
      }).catch(e => {
        console.log(e)
        throw e;
      })
      let records = await db.find({
        selector,
        fields: ['_id', 'name', 'url', 'collections', 'cases', "c_time", "owner_id", "enable", "capture_time"],
        sort: ['capture_time']
      }).catch(e => {
        console.log(e)
        throw e;
      });
      this.records = records.docs;
    },
    changeHandler(e) {
      let collection = e.target.value;
      this.loadRecords(collection).catch(e => { console.log(e) })
    }
  },
  mounted() {
    checkEnv();
    this.loadRecords().catch(e => { console.log("loadRecord Error") });
  }
};
Vue.config.productionTip = false;
Vue.use(SemanticUIVue);

new Vue({
  render: (h) => h(App),
}).$mount("#app");