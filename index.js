const express = require('express')
const fs = require('fs')
const Datastore = require('nedb')
class Server {
  constructor () {
    this.app = express()
  }
  async start () {
    console.log("starting server..")
    this.db = new Datastore({ filename: "./public/apebase/db", autoload: true });
    this.app.set('view engine', 'ejs');
    this.app.get("/ipfs/:cid", (req, res) => {
      res.sendFile(__dirname + "/public/apebase/ipfs/" + req.params.cid)
    })
    this.app.use(express.static('public'))
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json())
    this.app.get("/", async (req, res) => {
      let q = {}
      let page = 0
      if (req.query) {
        if (req.query.filter) q = JSON.parse(req.query.filter)
        if (req.query.page)  page = req.query.page
      }
      let items = await this.query(q, page)
      if (page > 0) {
        res.render("partial", { items })
      } else {
        res.render("index", {
          items,
          query: JSON.stringify(q, null, 2)
        })
      }
    })
    this.app.get("/token/:id", (req, res) => {
      this.db.findOne({
        id: req.params.id
      }, (err, doc) => {
        this.transformImage(doc)
        res.render("token", {
          item: doc
        })
      })
    })
    this.app.listen(3010)
  }
  query (q, page) {
    console.log("query = ", q)
    return new Promise((resolve, reject) => {
      this.db.find(q).sort({ _id: -1 }).limit(20).skip(page * 20).exec((err, docs) => {
        docs.forEach(this.transformImage)
        resolve(docs)
      })
    })
  }
  transformImage (doc) {
    if (doc.metadata.image.startsWith("Qm")) {
      doc.metadata.image = "/ipfs/" + doc.metadata.image
    } else if (doc.metadata.image.startsWith("/ipfs")) {
      doc.metadata.image = "/ipfs/" + doc.metadata.image.slice(5)
    } else if (doc.metadata.image.startsWith("ipfs://ipfs")) {
      doc.metadata.image = "/ipfs/" + doc.metadata.image.slice(12)
    } else if (doc.metadata.image.startsWith("ipfs://")) {
      doc.metadata.image = "/ipfs/" + doc.metadata.image.slice(7)
    }
  }
};
new Server().start();
