const express = require('express');
const http = require('http');
const path = require('path');
const User = require('./model/User');
const Publication = require('./model/Publication');
const app = express();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({extended:false});
const {check, validationResult} = require('express-validator');

const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const crypto = require('crypto');

const mongoURI = 'mongodb+srv://admin:1234@cluster0-tql9j.mongodb.net/projeto2?retryWrites=true&w=majority';

const conn = mongoose.createConnection(mongoURI);

let gfs;

conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

const session = require('express-session');
let flag = 0, login = 1;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
    secret: 'super secret session key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
   

app.get('/', (req, res) => {
    res.render('index', {login,btnPost: !login,search: !login});
});

app.get('/register', (req, res) => {
    res.render('register')
});

app.get('/login', (req, res) => {
    res.render('login')
});

app.get('/posts', (req, res) => {
    (async function() {
        const posts = await Publication.find();
        const images = await gfs.files.find().toArray();
        return res.status(200).json({texts: posts, images: images}).end();        
    })();  
});

app.get('/sair', (req, res) => {
    req.session.email = "";
    flag = 0;
    login = 1;
    res.redirect('/');
});

// app.get('/image/:filename', (req, res) => {
//     gfs.files.findOne({ filename: req.params.filename }, (err, file) => {

//       if (!file || file.length === 0) {
//         return res.status(404).json({
//           err: 'Insira uma imagem'
//         });
//       }
//     const readstream = gfs.createReadStream(file.filename);
//     readstream.pipe(res);
//     });
// });

app.post('/register', urlencodedParser,
[
    check('nome', 'Nome Invalido').isLength({min:3, max:45}),
    check('email', 'Email Invalido').isEmail(),
    check('senha', 'Senha Invalida').isLength({min:5, max:45}),
    check('cep', 'CEP Invalido').isLength({min:8, max:8}),
    check('rua', 'Rua Invalida').isLength({min:3, max:45}),
    check('bairro', 'Bairro Invalido').isLength({min:3, max:45}),
    check('numero', 'Numero Invalido').isLength({min:1, max:10})
],
(req, res) =>{
    console.log(req.body)
    console.log(req.body.nome)
    console.log(req.body.email)
    console.log(req.body.senha)
    console.log(req.body.cep)
    console.log(req.body.rua)
    console.log(req.body.bairro)
    console.log(req.body.numero)
    console.log(req.body.complemento)

    let user = new User({
        nome: req.body.nome,
        email: req.body.email,
        senha: req.body.senha,
        cep: req.body.cep,
        rua: req.body.rua,
        bairro: req.body.bairro,
        numero: req.body.numero,
        complemento: req.body.complemento,
    });
    
    (async function() {
        const errors = validationResult(req);
        if (!errors.isEmpty()) 
          return res.status(422).json({ errors: errors.array() }).end();

        const result = await User.find(user.email); 

        if(result.length > 0){
            return res.status(202).end();
        } else{
            await User.save(user);
            return res.status(200).end();
        }                
    })();            
});

app.post('/login',[
    check('email', 'Email Invalido').isEmail(),
    check('senha', 'Senha Invalida').isLength({min:5, max:45})
],
(req,res) => {
    (async function() {
        const errors = validationResult(req);
        if (!errors.isEmpty()) 
          return res.status(422).json({ errors: errors.array() }).end();

        const result = await User.find(req.body.email); 

        if(result.length > 0){
            if(result[0].senha === req.body.senha){
                req.session.email = req.body.email;
                login = 0;
                return res.status(200).end();
            }
            else{
                return res.status(202).end();
            }

        } else{
            return res.status(203).end();
        }                
    })();    
})

// app.post('/', upload.single('file'), urlencodedParser,
app.post('/', urlencodedParser,
[
    check('text', 'Insira um texto').isLength({min:1})
],
(req, res) =>{

    const errors = validationResult(req);
        if (!errors.isEmpty()) 
          return res.status(422).end();

    if(req.session && req.session.email){

        let publication = new Publication({
            email: req.session.email,
            text: req.body.text
        });
        
        (async function() {
            await Publication.save(publication);
            res.status(200).end();    
        })();
    }else{
        return res.status(202).end();
    }            
});

//http.createServer(app).listen(process.env.PORT || 8001);

http.createServer(app).listen(8000);