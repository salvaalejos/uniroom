# Como correr en mobile este proyecto. 
![./ignore.gif](https://media.tenor.com/6DlKoODackcAAAAM/evangelion-rei.gif)

1. Abrir el proyecto en VSCode o el IDE de su preferencia, y entrar a la carpeta de /mobile/uniroom

```bash
cd mobile
cd uniroom
```

2. Si es tu primera vez *en el proyecto* muy importante descargar las dependencias, nunca olvidar, indispensable antes de correr un proyecto descargado.  

```bash
npm install 
```

3. Y aqui tienes de a dos, o descargar el android SFX (ya sea aparte o usar el que viene incluido con Android Studio) o conectar tu celu. Te recomiendo usar tu celu, luego se traba. Eso si, incluso si tienes conectado el cel por cable, debes tener una buena conexión a internet para que se actualicen los cambios en tiempo real. (Debo averiguar porque no manda los cambios por el mismo cable xd, maybe pq crea un servidor al correr el proyecto pero es poco eficiente si se tiene el teléfono conectado). 
En cambio, si usas el simulador de Android debería actualizarse mejor, pero eso si, debes poner tu cuenta de Google y descargar Expo Go. 

4. Ahora si, en la terminal donde hiciste 1 y 2, debes correr el siguiente comando. 
```bash
npx expo start
```
Debería tardar lo suyo, pero una vez cargado te aparece un QR con un menú de opciones. 

5. En la misma terminal oprimes 
```bash
a 
```
Y debería abrir el proyecto en el celu que tengas conectado. 
## IMPORTANTE: 
Tu celu debe estar en la misma red que tu lap.
A veces al proyecto se le va la onda y dice que hubo un error. En esos casos oprime _Ctrl + C_ para cancelar el servidor y vuelvelo a correr, no se cargo bien el proyecto. (Tambien sirve revisar si tienes buena conexión a internet que no puede descargar el proyecto, si esta de la patada, mejor abre el celu en la lap xd)

