const express = require('express');
const http = require('http');
const path = require('path');
const User = require('./model/User');
const Publication = require('./model/Publication');
const app = express();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({extended:false});
const {check} = require('express-validator');

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

    (async function() {
        const result = await Publication.find();
        const images = await gfs.files.find().toArray();
        res.send({post:result, images: images});           
    })();   
});

// app.get('/sair', (req, res) => {

//     req.session.email="";
//     flag = 0;
//     login = 1;
//     res.redirect('/');
// });

// app.get('/login', (req, res) => {
//     flag ? res.render('login', {alert:'Usuário ainda não logado'}) : res.render('login');
//     flag = 0;
// });

// app.get('/post', (req, res) => {
//     if(req.session && req.session.email){
//         res.render('post', {
//             cache: req.session.email
//         })
//     }else{
//         flag = 1;
//         return res.redirect('/login');
//     }
// });

// app.get('/register', (req, res) => {

//     flag ? res.render('register', {alert:'Usuário ainda não cadastrado'}) : res.render('register');
//     flag = 0;
// });


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
        const result = await User.find(user.email); 

        if(result.length > 0){
            return res.send("Ja cadastrado");
            
            //return res.render('register', {alert:'Usuário já cadastrado'});
        } else{
            await User.save(user);
            return res.send(user);
            //res.redirect('/login');
        }                
    })();            
});

app.post('/login',[
    check('email', 'Email Invalido').isEmail(),
    check('senha', 'Senha Invalida').isLength({min:5, max:45})
],
(req,res)=>{
    

    (async function() {
        const result = await User.find(req.body.email); 

        if(result.length > 0){
            if(result[0].senha === req.body.senha){
                req.session.email = req.body.email;
                login = 0;
                return res.send(result);
            }
            else{
                return res.send('Senha incorreta');
            }

        } else{
            return res.send('Nao cadastrado');
        }                
    })();    
})

app.post('/post', upload.single('file'), urlencodedParser,
[
    check('text', 'Insira um texto').isLength({min:1})
],
(req, res) =>{

    if(req.session && req.session.email){
        let publication = new Publication({
            email: req.session.email,
            text: req.body.text
        });
        
        (async function() {
            await Publication.save(publication);
            res.send(publication);    
        })();
    }else{
        return res.send("Nao logado");
    }            
});

app.post('/search', (req, res) => {
    if(req.session && req.session.email){
        (async function() {
            const result = await Publication.search(req.body.search); 
            if(result.length > 0){
                res.send({
                    result: result
                })
            } else{
                res.send('Nenhum resultado encontrado');
            }                
        })();
    }else{
        return res.send('Nao logado');
    }
});

//http.createServer(app).listen(process.env.PORT || 8001);

http.createServer(app).listen(8000);